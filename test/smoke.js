/**
 * test/smoke.js — اختبار دخاني شامل لموقع فضفضة عشوائية.
 * يشغّل السيرفر تلقائيًا (على قاعدة بيانات معزولة في test/data) ثم يختبر:
 *  الصفحات، SEO، التسجيل/الدخول، المطابقة العشوائية، الرسائل عبر WebSocket،
 *  الحظر، الشارات غير المقروءة، حدّ المعدل، والتحقق المباشر من SQLite.
 *
 * التشغيل: npm test
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3210;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');
const TEST_DATA = path.join(__dirname, 'data');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
}

// جرّة كوكيز بسيطة لكل مستخدم
class Jar {
  constructor() { this.cookies = {}; }
  get header() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  store(setCookie) {
    if (!setCookie) return;
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of arr) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.cookies[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
  }
}

async function req(method, p, jar, body) {
  const headers = {};
  if (jar && jar.header) headers['Cookie'] = jar.header;
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + p, { method, headers, body: payload, redirect: 'manual' });
  if (jar) {
    // undici: getSetCookie()
    const sc = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : r.headers.get('set-cookie');
    jar.store(sc);
  }
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: r.status, json, text, headers: r.headers };
}

function waitForWsMessage(ws, pred, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { ws.off('message', onMsg); reject(new Error('timeout waiting for WS message')); }, timeoutMs);
    function onMsg(raw) {
      let d; try { d = JSON.parse(raw.toString()); } catch (e) { return; }
      if (pred(d)) { clearTimeout(t); ws.off('message', onMsg); resolve(d); }
    }
    ws.on('message', onMsg);
  });
}
function waitWsOpen(ws, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('WS open timeout')), timeoutMs);
    ws.on('open', () => { clearTimeout(t); resolve(); });
    ws.on('error', (e) => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  // نظّف بيانات اختبار سابقة
  fs.rmSync(TEST_DATA, { recursive: true, force: true });

  console.log('🚀 تشغيل السيرفر للاختبار…');
  const srv = spawn('node', ['server.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      DATA_DIR: TEST_DATA,
      SESSION_SECRET: 'smoke-test-secret',
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let bootOut = '';
  srv.stdout.on('data', (d) => { bootOut += d.toString(); });
  srv.stderr.on('data', (d) => { bootOut += d.toString(); });

  // انتظر رسالة الإقلاع
  const booted = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 20000);
    const iv = setInterval(() => {
      if (bootOut.includes('يعمل على')) { clearTimeout(t); clearInterval(iv); resolve(true); }
    }, 200);
  });
  ok('إقلاع السيرفر بدون أخطاء', booted, bootOut.slice(-300));
  if (!booted) { srv.kill(); process.exit(1); }

  // lazy-require بعد الإقلاع (ws و better-sqlite3 من node_modules المشروع)
  const { WebSocket } = require(path.join(ROOT, 'node_modules', 'ws'));
  const Database = require(path.join(ROOT, 'node_modules', 'better-sqlite3'));

  try {
    console.log('\n📄 الصفحات و SEO:');
    let r = await req('GET', '/');
    ok('GET / يرجع 200', r.status === 200, 'status=' + r.status);
    ok('العنوان العربي موجود', r.text.includes('<title>فضفضة عشوائية — دردشة عشوائية خاصة</title>'));
    ok('lang="ar" dir="rtl"', r.text.includes('lang="ar"') && r.text.includes('dir="rtl"'));
    ok('H1 واحد', (r.text.match(/<h1>/g) || []).length === 1);
    ok('meta description عربي', r.text.includes('موقع دردشة عشوائية خاصة'));
    ok('روابط /register و /login', r.text.includes('href="/register"') && r.text.includes('href="/login"'));

    r = await req('GET', '/robots.txt');
    ok('robots.txt يرجع 200 ويشير للـ sitemap', r.status === 200 && r.text.includes('Sitemap:'));

    r = await req('GET', '/sitemap.xml');
    ok('sitemap.xml يرجع 200', r.status === 200 && r.text.includes('<urlset'));

    r = await req('GET', '/app');
    ok('/app بدون جلسة يحوّل لـ /login', r.status === 302 && (r.headers.get('location') || '').includes('/login'));

    console.log('\n🔐 التسجيل والدخول:');
    const j1 = new Jar(), j2 = new Jar();
    r = await req('POST', '/api/register', j1, { username: 'ab', password: 'secret123' });
    ok('اسم مستخدم قصير → 400', r.status === 400);
    r = await req('POST', '/api/register', j1, { username: 'tester_one', password: '123' });
    ok('كلمة مرور قصيرة → 400', r.status === 400);
    r = await req('POST', '/api/register', j1, { username: 'tester_one', password: 'secret123' });
    ok('تسجيل مستخدم 1 → 200', r.status === 200 && r.json.user.username === 'tester_one');
    const u1id = r.json.user.id;
    r = await req('POST', '/api/register', j2, { username: 'tester_one', password: 'secret123' });
    ok('اسم مكرر → 400', r.status === 400);
    r = await req('POST', '/api/register', j2, { username: 'tester_two', password: 'secret123' });
    ok('تسجيل مستخدم 2 → 200', r.status === 200);
    const u2id = r.json.user.id;
    r = await req('POST', '/api/login', new Jar(), { username: 'tester_one', password: 'wrong' });
    ok('كلمة مرور خاطئة → 401', r.status === 401);
    r = await req('GET', '/api/me', j1);
    ok('/api/me يعيد المستخدم', r.status === 200 && r.json.user.id === u1id);

    console.log('\n🎲 المطابقة العشوائية:');
    r = await req('POST', '/api/match/find', j1, {});
    ok('مستخدم 1 يدخل الانتظار', r.status === 200 && r.json.status === 'waiting');

    // وصّل WebSocket للمستخدم 1 قبل مطابقة المستخدم 2 (ليستلم إشعار matched)
    const ws1 = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: { Cookie: j1.header } });
    await waitWsOpen(ws1);
    ok('اتصال WebSocket للمستخدم 1', true);
    const matchedP = waitForWsMessage(ws1, (d) => d.type === 'matched');

    r = await req('POST', '/api/match/find', j2, {});
    ok('مستخدم 2 يُطابق فورًا', r.status === 200 && r.json.status === 'matched');
    const convId = r.json.conversation.id;
    ok('المحادثة بين المستخدمين', r.json.conversation.other.id === u1id);
    const m1 = await matchedP;
    ok('المستخدم 1 استلم إشعار matched عبر WS بنفس المحادثة', m1.conversation.id === convId);

    console.log('\n💬 الرسائل الفورية:');
    const ws2 = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: { Cookie: j2.header } });
    await waitWsOpen(ws2);
    const recvP = waitForWsMessage(ws2, (d) => d.type === 'message' && d.message.body === 'مرحبًا، كيف حالك؟');
    const ackP = waitForWsMessage(ws1, (d) => d.type === 'message_ack' && d.temp_id === 't1');
    ws1.send(JSON.stringify({ type: 'message', conversation_id: convId, body: 'مرحبًا، كيف حالك؟', temp_id: 't1' }));
    const ack = await ackP;
    ok('تأكيد الإرسال عبر WS', !!ack.message && ack.message.id > 0);
    const recv = await recvP;
    ok('المستخدم 2 استلم الرسالة فوريًا عبر WS', recv.message.sender_id === u1id);

    r = await req('GET', '/api/conversations', j2);
    const conv2 = (r.json.conversations || [])[0];
    ok('قائمة المحادثات + شارة غير مقروء = 1', conv2 && conv2.unread_count === 1, JSON.stringify(conv2 && conv2.unread_count));

    r = await req('GET', `/api/conversations/${convId}/messages`, j2);
    ok('جلب الرسائل يعيد الرسالة', r.status === 200 && r.json.messages.length === 1 && r.json.messages[0].body === 'مرحبًا، كيف حالك؟');
    r = await req('GET', '/api/conversations', j2);
    ok('بعد القراءة الشارة = 0', (r.json.conversations[0] || {}).unread_count === 0);

    // تحقق مباشر من SQLite
    const db = new Database(path.join(TEST_DATA, 'chat.db'), { readonly: true });
    const row = db.prepare('SELECT body, sender_id FROM messages WHERE conversation_id = ?').get(convId);
    ok('الرسالة محفوظة في SQLite', !!row && row.body === 'مرحبًا، كيف حالك؟' && row.sender_id === u1id);
    const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    ok('المستخدمون محفوظون (2)', users === 2);
    const hashRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(u1id);
    ok('كلمة المرور مشفّرة (ليست نصًا صريحًا)', !!hashRow && !hashRow.password_hash.includes('secret123') && hashRow.password_hash.startsWith('$2'));
    db.close();

    // إرسال عبر HTTP API أيضًا (المسار البديل للإرسال)
    r = await req('POST', `/api/conversations/${convId}/messages`, j1, { body: 'رسالة عبر HTTP' });
    ok('إرسال رسالة عبر HTTP API', r.status === 200 && r.json.message.body === 'رسالة عبر HTTP');
    r = await req('POST', `/api/conversations/${convId}/messages`, j1, { body: '' });
    ok('رسالة فارغة → 400', r.status === 400);

    console.log('\n🛡️ الحظر:');
    r = await req('POST', `/api/users/${u2id}/block`, j1, {});
    ok('حظر مستخدم 2 → 200', r.status === 200);
    r = await req('POST', `/api/conversations/${convId}/messages`, j2, { body: 'هل تسمعني؟' });
    ok('المحظور لا يستطيع الإرسال → 403', r.status === 403);

    // u2 (المحظور من جهة u1) يدخل طابور الانتظار
    await req('POST', '/api/match/find', j2, {});
    // u1 يبحث عن شريك: المرشح الوحيد هو u2 المحظور → يجب ألا تتم مطابقة ويبقى منتظرًا
    r = await req('POST', '/api/match/next', j1, {});
    ok('لا مطابقة مع المحظور (يبقى في الانتظار)', r.status === 200 && r.json.status === 'waiting' && !r.json.conversation);

    // u2 يلغي الانتظار، ثم مستخدم جديد غير محظور يجب أن يُطابَق مع u1 المنتظر
    await req('POST', '/api/match/cancel', j2, {});
    const j4 = new Jar();
    r = await req('POST', '/api/register', j4, { username: 'tester_four', password: 'secret123' });
    const u4id = r.json.user.id;
    const ws4 = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: { Cookie: j4.header } });
    await waitWsOpen(ws4);
    const matchedU1P = waitForWsMessage(ws1, (d) => d.type === 'matched');
    r = await req('POST', '/api/match/find', j4, {});
    ok('مستخدم جديد يُطابَق مع u1 المنتظر', r.status === 200 && r.json.status === 'matched' && r.json.conversation.other.id === u1id);
    const mu1 = await matchedU1P;
    ok('u1 استلم إشعار المطابقة عبر WS', mu1.conversation.other.id === u4id);
    ws4.close();

    console.log('\n⏱️ حدّ المعدل:');
    let got429 = false;
    for (let i = 0; i < 35; i++) {
      const rr = await req('POST', '/api/login', new Jar(), { username: 'x', password: 'y' });
      if (rr.status === 429) { got429 = true; break; }
    }
    ok('حدّ المعدل يعمل (429 بعد محاولات كثيرة)', got429);

    ws1.close(); ws2.close();
  } finally {
    srv.kill();
  }

  console.log(`\n———— النتيجة: ${pass} ناجح / ${fail} فاشل ————`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('فشل الاختبار:', e); process.exit(1); });

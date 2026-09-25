/**
 * server.js — فضفضة عشوائية
 * موقع دردشة عشوائية خاصة: مطابقة عشوائية بين مستخدمين + رسائل 1-1 فورية.
 *
 * التقنيات: Express + ws (WebSocket) + better-sqlite3 + bcryptjs + express-session
 * الواجهة: HTML/CSS/JS خام، عربية RTL، ثيم داكن فقط.
 */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const signature = require('cookie-signature');
const { WebSocketServer } = require('ws');
const db = require('./src/db');

// ---------------------------------------------------------------- الإعدادات
const SITE_NAME = process.env.SITE_NAME || 'فضفضة عشوائية';
const TAGLINE = process.env.TAGLINE || 'دردشة عشوائية للفضفضة — تحدث مع غرباء بخصوصية تامة';
const SITE_URL = (process.env.SITE_URL || 'https://example.com').replace(/\/+$/, '');
const PORT = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const SESSION_COOKIE_NAME = 'fadfdasha.sid';

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  تحذير: SESSION_SECRET غير معرّف — يتم استخدام قيمة تجريبية غير آمنة. عرّفها في الإنتاج!');
}

// هروب بسيط للقيم القادمة من متغيرات البيئة قبل حقنها في HTML
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------------------------------------------------------------- قاعدة البيانات
const q = {
  userById: db.prepare('SELECT id, username, created_at, last_seen FROM users WHERE id = ?'),
  userByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  createUser: db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, datetime('now'))"),
  touchSeen: db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?"),
  convById: db.prepare('SELECT * FROM conversations WHERE id = ?'),
  convBetween: db.prepare('SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ?'),
  createConv: db.prepare("INSERT INTO conversations (user1_id, user2_id, created_at) VALUES (?, ?, datetime('now'))"),
  insertMsg: db.prepare("INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, datetime('now'))"),
  msgById: db.prepare('SELECT * FROM messages WHERE id = ?'),
  lastMsg: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1'),
  maxMsgId: db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM messages WHERE conversation_id = ?'),
  readRow: db.prepare('SELECT last_read_id FROM reads WHERE conversation_id = ? AND user_id = ?'),
  upsertRead: db.prepare(`
    INSERT INTO reads (conversation_id, user_id, last_read_id) VALUES (?, ?, ?)
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_id = excluded.last_read_id`),
  unreadCount: db.prepare('SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ? AND id > ? AND sender_id != ?'),
  isBlocked: db.prepare(`SELECT 1 FROM blocks
    WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`),
  blockUser: db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, datetime('now'))"),
  unblockUser: db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?'),
  blockedByMe: db.prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ? LIMIT 1'),
  convList: db.prepare(`
    SELECT c.id FROM conversations c
    WHERE (c.user1_id = ? OR c.user2_id = ?)
      AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = ? AND b.blocked_id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
           OR (b.blocked_id = ? AND b.blocker_id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
      )
    ORDER BY COALESCE((SELECT MAX(m.id) FROM messages m WHERE m.conversation_id = c.id), 0) DESC, c.id DESC`),
  convMessages: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?'),
};

// ترتيب الزوج تصاعديًا لضمان فرادة المحادثة بين أي شخصين
function pairKey(a, b) { return a < b ? [a, b] : [b, a]; }

function getOrCreateConversation(a, b) {
  const [u1, u2] = pairKey(a, b);
  let c = q.convBetween.get(u1, u2);
  if (!c) {
    const r = q.createConv.run(u1, u2);
    c = q.convById.get(r.lastInsertRowid);
  }
  return c;
}

function isBlocked(a, b) { return !!q.isBlocked.get(a, b, b, a); }

function markRead(cid, uid) {
  const maxId = q.maxMsgId.get(cid).m;
  q.upsertRead.run(cid, uid, maxId);
}

// ---------------------------------------------------------------- Express
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

const sessionStore = new session.MemoryStore();
app.use(session({
  name: SESSION_COOKIE_NAME,
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === '1',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 يومًا
  },
}));

// محدّد معدل بسيط في الذاكرة لمسارات المصادقة
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    if (arr.length > max) {
      return res.status(429).json({ error: 'طلبات كثيرة جدًا — حاول بعد قليل' });
    }
    next();
  };
}
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'سجّل الدخول أولًا' });
  next();
}

// التحقق من اسم المستخدم: 3-20 حرفًا (يدعم العربية)، أحرف وأرقام و._-
const USERNAME_RE = /^[\p{L}\p{N}._-]{3,20}$/u;

// ---------------------------------------------------------------- الصفحات (مع حقن اسم الموقع والرابط)
const PAGES = {};
for (const f of ['index.html', 'register.html', 'login.html', 'app.html', 'robots.txt', 'sitemap.xml']) {
  PAGES[f] = fs.readFileSync(path.join(__dirname, 'public', f), 'utf8');
}
function render(name, res, contentType) {
  const out = PAGES[name]
    .replaceAll('{{SITE_NAME}}', escapeHtml(SITE_NAME))
    .replaceAll('{{TAGLINE}}', escapeHtml(TAGLINE))
    .replaceAll('{{SITE_URL}}', escapeHtml(SITE_URL));
  res.type(contentType).send(out);
}

app.get('/', (req, res) => render('index.html', res, 'text/html; charset=utf-8'));
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  render('register.html', res, 'text/html; charset=utf-8');
});
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  render('login.html', res, 'text/html; charset=utf-8');
});
app.get('/app', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  render('app.html', res, 'text/html; charset=utf-8');
});
app.get('/robots.txt', (req, res) => render('robots.txt', res, 'text/plain; charset=utf-8'));
app.get('/sitemap.xml', (req, res) => render('sitemap.xml', res, 'application/xml; charset=utf-8'));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------- API: المصادقة
app.post('/api/register', authLimiter, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون 3-20 حرفًا (أحرف/أرقام/._-)' });
  }
  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  if (q.userByUsername.get(username)) {
    return res.status(400).json({ error: 'اسم المستخدم مسجّل مسبقًا — اختر اسمًا آخر' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = q.createUser.run(username, hash);
  req.session.userId = r.lastInsertRowid;
  q.touchSeen.run(req.session.userId);
  res.json({ ok: true, user: { id: req.session.userId, username } });
});

app.post('/api/login', authLimiter, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = q.userByUsername.get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  req.session.userId = user.id;
  q.touchSeen.run(user.id);
  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'غير مسجّل' });
  const u = q.userById.get(req.session.userId);
  if (!u) return res.status(401).json({ error: 'غير مسجّل' });
  res.json({ user: { id: u.id, username: u.username } });
});

// ---------------------------------------------------------------- API: المحادثات والرسائل
function conversationView(cid, me) {
  const conv = q.convById.get(cid);
  if (!conv) return null;
  const otherId = conv.user1_id === me ? conv.user2_id : conv.user1_id;
  const other = q.userById.get(otherId);
  if (!other) return null;
  const last = q.lastMsg.get(cid);
  const lr = q.readRow.get(cid, me);
  const lastReadId = lr ? lr.last_read_id : 0;
  const unread = q.unreadCount.get(cid, lastReadId, me).c;
  return {
    id: conv.id,
    created_at: conv.created_at,
    other: {
      id: other.id,
      username: other.username,
      online: isOnline(otherId),
      blocked_by_me: !!q.blockedByMe.get(me, otherId),
    },
    last_message: last
      ? { id: last.id, body: last.body, sender_id: last.sender_id, created_at: last.created_at }
      : null,
    unread_count: unread,
  };
}

app.get('/api/conversations', requireAuth, (req, res) => {
  const me = req.session.userId;
  const rows = q.convList.all(me, me, me, me, me, me);
  res.json({ conversations: rows.map((r) => conversationView(r.id, me)) });
});

app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const me = req.session.userId;
  const cid = Number(req.params.id);
  const conv = q.convById.get(cid);
  if (!conv || (conv.user1_id !== me && conv.user2_id !== me)) {
    return res.status(404).json({ error: 'المحادثة غير موجودة' });
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const msgs = q.convMessages.all(cid, limit).reverse();
  markRead(cid, me);
  res.json({ messages: msgs });
});

function insertMessage(cid, senderId, body) {
  const r = q.insertMsg.run(cid, senderId, body);
  return q.msgById.get(r.lastInsertRowid);
}

app.post('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const me = req.session.userId;
  const cid = Number(req.params.id);
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 2000) {
    return res.status(400).json({ error: 'نص الرسالة غير صالح' });
  }
  const conv = q.convById.get(cid);
  if (!conv || (conv.user1_id !== me && conv.user2_id !== me)) {
    return res.status(404).json({ error: 'المحادثة غير موجودة' });
  }
  const other = conv.user1_id === me ? conv.user2_id : conv.user1_id;
  if (isBlocked(me, other)) {
    return res.status(403).json({ error: 'لا يمكنك مراسلة هذا المستخدم' });
  }
  const msg = insertMessage(cid, me, body);
  q.touchSeen.run(me);
  broadcastMessage(msg, me);
  res.json({ message: msg });
});

// ---------------------------------------------------------------- API: المطابقة العشوائية
// طابور الانتظار: Map<userId, {queuedAt}>
const waitingQueue = new Map();

function tryMatch(uid) {
  // رشّح: مستخدم آخر منتظر + متصل فعليًا + غير محظور من الطرفين
  const candidates = [];
  for (const otherId of waitingQueue.keys()) {
    if (otherId === uid) continue;
    if (!isOnline(otherId)) { waitingQueue.delete(otherId); continue; }
    if (isBlocked(uid, otherId)) continue;
    candidates.push(otherId);
  }
  if (candidates.length === 0) {
    waitingQueue.set(uid, { queuedAt: Date.now() });
    return null; // ابقَ في الانتظار
  }
  const partner = candidates[Math.floor(Math.random() * candidates.length)];
  waitingQueue.delete(uid);
  waitingQueue.delete(partner);
  const conv = getOrCreateConversation(uid, partner);
  sendToUser(uid, { type: 'matched', conversation: conversationView(conv.id, uid) });
  sendToUser(partner, { type: 'matched', conversation: conversationView(conv.id, partner) });
  return conversationView(conv.id, uid);
}

app.post('/api/match/find', requireAuth, (req, res) => {
  const me = req.session.userId;
  if (waitingQueue.has(me)) return res.json({ status: 'waiting' });
  const conv = tryMatch(me);
  if (conv) return res.json({ status: 'matched', conversation: conv });
  res.json({ status: 'waiting' });
});

app.post('/api/match/next', requireAuth, (req, res) => {
  const me = req.session.userId;
  waitingQueue.delete(me); // اخرج من أي انتظار سابق ثم ابحث من جديد
  const conv = tryMatch(me);
  if (conv) return res.json({ status: 'matched', conversation: conv });
  res.json({ status: 'waiting' });
});

app.post('/api/match/cancel', requireAuth, (req, res) => {
  waitingQueue.delete(req.session.userId);
  res.json({ status: 'cancelled' });
});

app.get('/api/match/status', requireAuth, (req, res) => {
  res.json({ waiting: waitingQueue.has(req.session.userId) });
});

// ---------------------------------------------------------------- API: الحظر
app.post('/api/users/:id/block', requireAuth, (req, res) => {
  const me = req.session.userId;
  const target = Number(req.params.id);
  if (!target || target === me) return res.status(400).json({ error: 'مستخدم غير صالح' });
  if (!q.userById.get(target)) return res.status(404).json({ error: 'المستخدم غير موجود' });
  q.blockUser.run(me, target);
  res.json({ ok: true });
});

app.delete('/api/users/:id/block', requireAuth, (req, res) => {
  const me = req.session.userId;
  const target = Number(req.params.id);
  q.unblockUser.run(me, target);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- WebSocket (فوري)
const clients = new Map(); // userId -> Set<ws>

function isOnline(uid) {
  const set = clients.get(uid);
  return !!set && [...set].some((s) => s.readyState === 1);
}

function sendToUser(uid, obj) {
  const set = clients.get(uid);
  if (!set) return;
  const data = JSON.stringify(obj);
  for (const s of set) {
    if (s.readyState === 1) s.send(data);
  }
}

function broadcastAll(obj) {
  const data = JSON.stringify(obj);
  for (const set of clients.values()) {
    for (const s of set) {
      if (s.readyState === 1) s.send(data);
    }
  }
}

function broadcastMessage(msg, senderId) {
  const conv = q.convById.get(msg.conversation_id);
  if (!conv) return;
  const other = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
  const payload = JSON.stringify({ type: 'message', message: msg });
  for (const uid of [senderId, other]) {
    const set = clients.get(uid);
    if (!set) continue;
    for (const s of set) {
      if (s.readyState === 1) s.send(payload);
    }
  }
}

function getSessionIdFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const prefix = SESSION_COOKIE_NAME + '=';
  const part = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(prefix));
  if (!part) return null;
  let val = decodeURIComponent(part.slice(prefix.length));
  if (val.startsWith('s:')) val = val.slice(2);
  return signature.unsign(val, SESSION_SECRET) || null;
}

const server = require('http').createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const sid = getSessionIdFromCookie(req.headers.cookie);
  if (!sid) { ws.close(4401, 'unauthorized'); return; }
  sessionStore.get(sid, (err, sess) => {
    if (err || !sess || !sess.userId) { ws.close(4401, 'unauthorized'); return; }
    const uid = sess.userId;
    if (!clients.has(uid)) clients.set(uid, new Set());
    const wasOffline = !isOnline(uid);
    clients.get(uid).add(ws);
    q.touchSeen.run(uid);
    if (wasOffline) broadcastAll({ type: 'presence', user_id: uid, online: true });
    ws.send(JSON.stringify({ type: 'welcome', user_id: uid }));

    ws.on('message', (raw) => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (data.type === 'ping') {
        q.touchSeen.run(uid);
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (data.type === 'read') {
        const cid = Number(data.conversation_id);
        const conv = q.convById.get(cid);
        if (conv && (conv.user1_id === uid || conv.user2_id === uid)) {
          markRead(cid, uid);
          const other = conv.user1_id === uid ? conv.user2_id : conv.user1_id;
          sendToUser(other, { type: 'read', conversation_id: cid, user_id: uid });
        }
        return;
      }
      if (data.type === 'message') {
        const cid = Number(data.conversation_id);
        const body = String(data.body || '').trim();
        if (!cid || !body || body.length > 2000) {
          ws.send(JSON.stringify({ type: 'error', message: 'رسالة غير صالحة' }));
          return;
        }
        const conv = q.convById.get(cid);
        if (!conv || (conv.user1_id !== uid && conv.user2_id !== uid)) {
          ws.send(JSON.stringify({ type: 'error', message: 'المحادثة غير موجودة' }));
          return;
        }
        const other = conv.user1_id === uid ? conv.user2_id : conv.user1_id;
        if (isBlocked(uid, other)) {
          ws.send(JSON.stringify({ type: 'error', message: 'لا يمكنك مراسلة هذا المستخدم' }));
          return;
        }
        const msg = insertMessage(cid, uid, body);
        q.touchSeen.run(uid);
        ws.send(JSON.stringify({ type: 'message_ack', temp_id: data.temp_id, message: msg }));
        // أرسل للطرف الآخر + أي تبويبات أخرى للمرسل (عدا هذا الاتصال)
        const payload = JSON.stringify({ type: 'message', message: msg });
        for (const targetUid of [uid, other]) {
          const set = clients.get(targetUid);
          if (!set) continue;
          for (const s of set) {
            if (s !== ws && s.readyState === 1) s.send(payload);
          }
        }
        return;
      }
    });

    ws.on('close', () => {
      const set = clients.get(uid);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          clients.delete(uid);
          waitingQueue.delete(uid); // الخروج من طابور الانتظار عند انقطاع الاتصال
          q.touchSeen.run(uid);
          broadcastAll({ type: 'presence', user_id: uid, online: false });
        }
      }
    });
  });
});

// ---------------------------------------------------------------- 404 ومعالج الأخطاء
app.use((req, res) => {
  res.status(404).type('text/html; charset=utf-8').send(
    `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>غير موجود — ${escapeHtml(SITE_NAME)}</title></head>` +
    `<body style="background:#050505;color:#e8ecf4;font-family:system-ui;text-align:center;padding:80px 20px">` +
    `<h1>404 — الصفحة غير موجودة</h1><p><a href="/" style="color:#60a5fa">العودة للرئيسية</a></p></body></html>`
  );
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
});

server.listen(PORT, () => {
  console.log(`✅ ${SITE_NAME} يعمل على http://localhost:${PORT}`);
});

module.exports = { app, server };

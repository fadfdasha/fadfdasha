/**
 * app.js — تطبيق الدردشة: مطابقة عشوائية + رسائل فورية عبر WebSocket.
 * كل محتوى المستخدم يُعرض عبر textContent فقط (لا innerHTML مع مدخلات).
 */
(function () {
  'use strict';

  // ---------- أدوات ----------
  const $ = (sel) => document.querySelector(sel);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  async function api(path, opts) {
    opts = opts || {};
    const r = await fetch(path, Object.assign({
      headers: { 'Content-Type': 'application/json' },
    }, opts));
    let data = null;
    try { data = await r.json(); } catch (e) { /* ignore */ }
    if (!r.ok) {
      const err = new Error((data && data.error) || ('خطأ ' + r.status));
      err.status = r.status;
      throw err;
    }
    return data || {};
  }
  function fmtTime(ts) {
    // ts بصيغة "YYYY-MM-DD HH:MM:SS" (UTC) — نعرض HH:MM فقط
    if (!ts || ts.length < 16) return '';
    return ts.slice(11, 16);
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
  }

  // ---------- الحالة ----------
  let me = null;
  let ws = null;
  let wsRetryMs = 1000;
  let conversations = [];
  let currentId = null;
  let waiting = false;
  let onlineUsers = {}; // userId -> true
  const pendingAcks = new Map();

  // ---------- العروض ----------
  function showView(name) {
    ['home', 'waiting', 'chat'].forEach((v) => {
      $('#view-' + v).classList.toggle('hidden', v !== name);
    });
    document.querySelectorAll('.conv-item').forEach((n) => {
      n.classList.toggle('active', Number(n.dataset.cid) === currentId);
    });
  }

  function renderConversations() {
    const list = $('#convList');
    list.textContent = '';
    if (conversations.length === 0) {
      list.appendChild(el('div', 'empty-note', 'لا توجد محادثات بعد — ابدأ دردشة عشوائية!'));
      return;
    }
    conversations.forEach((c) => {
      const item = el('div', 'conv-item' + (c.id === currentId ? ' active' : ''));
      item.dataset.cid = c.id;
      const dot = el('span', 'dot ' + (c.other.online || onlineUsers[c.other.id] ? 'online' : 'offline'));
      const info = el('div', 'info');
      info.appendChild(el('div', 'name', c.other.username));
      const snippet = c.last_message
        ? (c.last_message.sender_id === me.id ? 'أنت: ' : '') + c.last_message.body
        : 'محادثة جديدة';
      info.appendChild(el('div', 'snippet', snippet.length > 40 ? snippet.slice(0, 40) + '…' : snippet));
      item.appendChild(dot);
      item.appendChild(info);
      if (c.unread_count > 0) item.appendChild(el('span', 'unread-badge', String(c.unread_count)));
      item.addEventListener('click', () => openConversation(c.id));
      list.appendChild(item);
    });
  }

  async function refreshConversations() {
    try {
      const data = await api('/api/conversations');
      conversations = data.conversations || [];
      conversations.forEach((c) => { if (c.other.online) onlineUsers[c.other.id] = true; });
      renderConversations();
    } catch (e) { /* سيُعاد المحاولة لاحقًا */ }
  }

  function appendMessage(msg) {
    const box = $('#messages');
    const mine = msg.sender_id === me.id;
    const div = el('div', 'msg ' + (mine ? 'mine' : 'theirs'));
    div.appendChild(el('div', null, msg.body));
    div.appendChild(el('span', 'time', fmtTime(msg.created_at)));
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  async function openConversation(cid) {
    if (waiting) await cancelWaiting();
    currentId = cid;
    const conv = conversations.find((c) => c.id === cid);
    showView('chat');
    renderConversations();
    if (conv) {
      $('#peerName').textContent = conv.other.username;
      updatePeerPresence(conv.other.id);
      const blockBtn = $('#blockBtn');
      blockBtn.textContent = conv.other.blocked_by_me ? 'إلغاء الحظر' : 'حظر';
      blockBtn.dataset.blocked = conv.other.blocked_by_me ? '1' : '0';
    }
    const box = $('#messages');
    box.textContent = '';
    try {
      const data = await api('/api/conversations/' + cid + '/messages?limit=100');
      (data.messages || []).forEach(appendMessage);
      // علّم كمقروء عبر WS أيضًا ليُخطر الطرف الآخر
      sendWs({ type: 'read', conversation_id: cid });
      await refreshConversations();
    } catch (e) {
      toast(e.message);
    }
  }

  function updatePeerPresence(uid) {
    const online = !!onlineUsers[uid];
    const dot = $('#peerDot');
    dot.className = 'dot ' + (online ? 'online' : 'offline');
    $('#peerStatus').textContent = online ? 'متصل الآن' : 'غير متصل';
  }

  function closeChat() {
    currentId = null;
    const box = $('#messages');
    if (box) box.textContent = '';
    showView(waiting ? 'waiting' : 'home');
    renderConversations();
  }

  // ---------- المطابقة العشوائية ----------
  async function startRandom() {
    try {
      const data = await api('/api/match/find', { method: 'POST' });
      if (data.status === 'matched') {
        waiting = false;
        await refreshConversations();
        openConversation(data.conversation.id);
        toast('تم إيجاد شريك دردشة! 🎉');
      } else {
        waiting = true;
        showView('waiting');
      }
    } catch (e) { toast(e.message); }
  }

  async function nextMatch() {
    try {
      const data = await api('/api/match/next', { method: 'POST' });
      currentId = null;
      if (data.status === 'matched') {
        waiting = false;
        await refreshConversations();
        openConversation(data.conversation.id);
        toast('شريك جديد! 🎲');
      } else {
        waiting = true;
        const box = $('#messages');
        if (box) box.textContent = '';
        showView('waiting');
        renderConversations();
      }
    } catch (e) { toast(e.message); }
  }

  async function cancelWaiting() {
    try { await api('/api/match/cancel', { method: 'POST' }); } catch (e) { /* ignore */ }
    waiting = false;
    showView('home');
  }

  // ---------- إرسال الرسائل ----------
  function sendWs(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  function sendMessage(cid, body) {
    return new Promise((resolve, reject) => {
      const doHttp = () => {
        api('/api/conversations/' + cid + '/messages', {
          method: 'POST', body: JSON.stringify({ body }),
        }).then((d) => resolve(d.message)).catch(reject);
      };
      if (ws && ws.readyState === WebSocket.OPEN) {
        const tempId = 't' + Date.now() + Math.floor(Math.random() * 1000);
        pendingAcks.set(tempId, { resolve, reject });
        ws.send(JSON.stringify({ type: 'message', conversation_id: cid, body: body, temp_id: tempId }));
        setTimeout(() => {
          if (pendingAcks.has(tempId)) { pendingAcks.delete(tempId); doHttp(); }
        }, 4000);
      } else {
        doHttp();
      }
    });
  }

  // ---------- WebSocket ----------
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/ws');

    ws.onopen = () => { wsRetryMs = 1000; };

    ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch (e) { return; }
      switch (data.type) {
        case 'message_ack': {
          const p = pendingAcks.get(data.temp_id);
          if (p) { pendingAcks.delete(data.temp_id); p.resolve(data.message); }
          // حدّث القائمة أيضًا
          refreshConversations();
          break;
        }
        case 'message': {
          const msg = data.message;
          if (msg.conversation_id === currentId) {
            appendMessage(msg);
            sendWs({ type: 'read', conversation_id: currentId });
          }
          refreshConversations();
          break;
        }
        case 'matched': {
          waiting = false;
          refreshConversations().then(() => {
            openConversation(data.conversation.id);
            toast('تم إيجاد شريك دردشة! 🎉');
          });
          break;
        }
        case 'presence': {
          if (data.online) onlineUsers[data.user_id] = true;
          else delete onlineUsers[data.user_id];
          renderConversations();
          const conv = conversations.find((c) => c.id === currentId);
          if (conv && conv.other.id === data.user_id) updatePeerPresence(data.user_id);
          break;
        }
        case 'error':
          toast(data.message || 'خطأ');
          break;
      }
    };

    ws.onclose = () => {
      setTimeout(connectWS, wsRetryMs);
      wsRetryMs = Math.min(wsRetryMs * 2, 15000);
    };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }

  // نبضة للحفاظ على حالة "متصل"
  setInterval(() => sendWs({ type: 'ping' }), 25000);

  // ---------- الأحداث ----------
  function bind() {
    $('#randomBtn').addEventListener('click', startRandom);
    $('#randomBtn2').addEventListener('click', startRandom);
    $('#cancelWaitBtn').addEventListener('click', cancelWaiting);
    $('#nextBtn').addEventListener('click', () => {
      if (confirm('متأكد؟ سنبحث لك عن شخص جديد عشوائي.')) nextMatch();
    });
    $('#backBtn').addEventListener('click', closeChat);
    $('#logoutBtn').addEventListener('click', async () => {
      try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
      if (ws) ws.close();
      window.location.href = '/';
    });
    $('#blockBtn').addEventListener('click', async () => {
      const conv = conversations.find((c) => c.id === currentId);
      if (!conv) return;
      const isBlocked = $('#blockBtn').dataset.blocked === '1';
      const action = isBlocked ? 'إلغاء حظر' : 'حظر';
      if (!confirm(action + ' ' + conv.other.username + '؟')) return;
      try {
        if (isBlocked) {
          await api('/api/users/' + conv.other.id + '/block', { method: 'DELETE' });
          toast('تم إلغاء الحظر');
        } else {
          await api('/api/users/' + conv.other.id + '/block', { method: 'POST' });
          toast('تم حظر المستخدم');
        }
        await refreshConversations();
        closeChat();
      } catch (e) { toast(e.message); }
    });
    $('#sendForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#msgInput');
      const body = input.value.trim();
      if (!body || !currentId) return;
      input.value = '';
      try {
        const msg = await sendMessage(currentId, body);
        appendMessage(msg);
        refreshConversations();
      } catch (err) {
        toast(err.message);
        input.value = body;
      }
    });
  }

  // ---------- بدء ----------
  (async function init() {
    try {
      const data = await api('/api/me');
      me = data.user;
    } catch (e) {
      window.location.href = '/login';
      return;
    }
    $('#userName').textContent = me.username;
    bind();
    connectWS();
    await refreshConversations();
    try {
      const st = await api('/api/match/status');
      if (st.waiting) { waiting = true; showView('waiting'); }
      else showView('home');
    } catch (e) { showView('home'); }
    // تحديث دوري خفيف للقائمة (احتياطًا إن فاتت أحداث WS)
    setInterval(refreshConversations, 30000);
  })();
})();

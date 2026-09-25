/**
 * src/db.js — تهيئة قاعدة بيانات SQLite (better-sqlite3)
 *
 * الجداول:
 *  users         — id, username (فريد), password_hash, created_at, last_seen
 *  conversations — id, user1_id, user2_id (الزوج مرتب تصاعديًا وفريد), created_at
 *  messages      — id, conversation_id, sender_id, body, created_at
 *  blocks        — blocker_id, blocked_id (حظر متبادل المنع)
 *  reads         — conversation_id, user_id, last_read_id (لتتبع غير المقروء)
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// مجلد البيانات — يمكن تغييره عبر متغير البيئة DATA_DIR (مفيد للاختبارات)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'chat.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen     TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user1_id   INTEGER NOT NULL,
  user2_id   INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user1_id, user2_id),
  FOREIGN KEY (user1_id) REFERENCES users (id),
  FOREIGN KEY (user2_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id       INTEGER NOT NULL,
  body            TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations (id),
  FOREIGN KEY (sender_id) REFERENCES users (id)
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, id);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL,
  blocked_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reads (
  conversation_id INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  last_read_id    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);
`);

module.exports = db;

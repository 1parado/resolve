import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from '../config.js'

// 确保数据目录存在
mkdirSync(dirname(config.dbPath), { recursive: true })

export const db = new Database(config.dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/** 初始化数据库表结构 */
export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE,
      github        TEXT UNIQUE,
      password_hash TEXT,
      provider      TEXT NOT NULL DEFAULT 'email',
      color         TEXT,
      job           TEXT DEFAULT '',
      os            TEXT DEFAULT 'linux',
      bio           TEXT DEFAULT '',
      joined        INTEGER NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      connected  INTEGER NOT NULL DEFAULT 0,
      name       TEXT DEFAULT '',
      ip         TEXT DEFAULT '',
      port       TEXT DEFAULT '',
      runtime    TEXT DEFAULT '',
      os         TEXT DEFAULT '',
      visibility TEXT DEFAULT 'public',
      published  INTEGER NOT NULL DEFAULT 0,
      agents     TEXT DEFAULT '[]',
      token      TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS agents (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name    TEXT NOT NULL,
      product TEXT DEFAULT '',
      icon    TEXT DEFAULT '',
      status  TEXT DEFAULT 'offline',
      accent  TEXT DEFAULT '#6366f1',
      models  TEXT DEFAULT '[]',
      price   TEXT DEFAULT '',
      unit    TEXT DEFAULT '',
      tags    TEXT DEFAULT '[]',
      desc    TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS wallet (
      user_id     TEXT PRIMARY KEY REFERENCES users(id),
      balance     REAL NOT NULL DEFAULT 0,
      month_cost  REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS billing (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      time    INTEGER NOT NULL,
      type    TEXT NOT NULL,
      agent   TEXT DEFAULT '',
      amount  REAL NOT NULL,
      status  TEXT DEFAULT 'success',
      method  TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS marketplace (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      node_id      TEXT DEFAULT '',
      cat          TEXT DEFAULT 'code',
      name         TEXT NOT NULL,
      vendor       TEXT DEFAULT '',
      vendor_github TEXT DEFAULT '',
      icon         TEXT DEFAULT '',
      accent       TEXT DEFAULT '#6366f1',
      online       INTEGER NOT NULL DEFAULT 1,
      rating       REAL NOT NULL DEFAULT 5,
      orders       INTEGER NOT NULL DEFAULT 0,
      price        TEXT DEFAULT '',
      price_num    REAL NOT NULL DEFAULT 0,
      tags         TEXT DEFAULT '[]',
      models       TEXT DEFAULT '[]',
      desc         TEXT DEFAULT '',
      sla          TEXT DEFAULT '',
      featured     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      title        TEXT NOT NULL,
      agent        TEXT DEFAULT '',
      agent_icon   TEXT DEFAULT '',
      agent_accent TEXT DEFAULT '#6366f1',
      type         TEXT DEFAULT 'once',
      status       TEXT DEFAULT 'pending',
      progress     INTEGER NOT NULL DEFAULT 0,
      tokens       INTEGER NOT NULL DEFAULT 0,
      cost         REAL NOT NULL DEFAULT 0,
      created      INTEGER NOT NULL,
      schedule     TEXT
    );

    CREATE TABLE IF NOT EXISTS enterprises (
      id      TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      name    TEXT NOT NULL,
      seats   INTEGER NOT NULL DEFAULT 10,
      settings TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS enterprise_members (
      id          TEXT PRIMARY KEY,
      enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
      user_id     TEXT REFERENCES users(id),
      name        TEXT NOT NULL,
      job         TEXT DEFAULT '',
      os          TEXT DEFAULT 'linux',
      role        TEXT DEFAULT '成员',
      online      INTEGER NOT NULL DEFAULT 0,
      avatar      TEXT DEFAULT '',
      agents      TEXT DEFAULT '[]',
      models      TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS enterprise_logs (
      id      TEXT PRIMARY KEY,
      enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
      time    INTEGER NOT NULL,
      who     TEXT DEFAULT '',
      action  TEXT DEFAULT '',
      result  TEXT DEFAULT '',
      type    TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS node_tasks (
      id            TEXT PRIMARY KEY,
      node_id       TEXT DEFAULT '',
      owner_user_id TEXT DEFAULT '',
      caller_user_id TEXT DEFAULT '',
      item_id       TEXT DEFAULT '',
      vendor        TEXT DEFAULT '',
      agent         TEXT DEFAULT '',
      prompt        TEXT DEFAULT '',
      status        TEXT DEFAULT 'running',
      log           TEXT DEFAULT '',
      tokens        INTEGER DEFAULT 0,
      cost          REAL DEFAULT 0,
      created       INTEGER NOT NULL,
      finished      INTEGER DEFAULT 0
    );
  `)

  // ---- 轻量迁移：为已存在的表补充新增列 ----
  migrateAddColumn('nodes', 'token', "TEXT DEFAULT ''")
  migrateAddColumn('nodes', 'agents_info', "TEXT DEFAULT '[]'")
  migrateAddColumn('marketplace', 'node_id', "TEXT DEFAULT ''")
}

/** 若列不存在则添加（SQLite 无 IF NOT EXISTS for column） */
function migrateAddColumn(table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
    console.log(`[db] 迁移: ${table} 新增列 ${column}`)
  }
}
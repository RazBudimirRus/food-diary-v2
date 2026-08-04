/**
 * Shared SQLite + Drizzle connection (Phase 29.2).
 * Lazy init so tests can set SQLITE_DB_PATH before first use.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

type SqliteDb = Database.Database;
type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let _sqlite: SqliteDb | undefined;
let _db: AppDb | undefined;

function init() {
  if (_sqlite && _db) return;
  const DB_PATH = process.env.SQLITE_DB_PATH || "data/data.db";
  const dir = path.dirname(DB_PATH);
  if (dir && dir !== ".") {
    fs.mkdirSync(dir, { recursive: true });
  }
  _sqlite = new Database(DB_PATH);
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.pragma("synchronous = NORMAL");
  _sqlite.pragma("foreign_keys = ON");
  _db = drizzle(_sqlite, { schema });
}

export function getSqlite(): SqliteDb {
  init();
  return _sqlite!;
}

export function getDb(): AppDb {
  init();
  return _db!;
}

/** Lazy proxies — first property access opens the DB with current env. */
export const sqlite: SqliteDb = new Proxy({} as SqliteDb, {
  get(_target, prop, receiver) {
    const real = getSqlite();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

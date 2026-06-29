/**
 * Versioned migrations via drizzle-kit (Phase 26.1)
 *
 * Запускается один раз при старте сервера перед инициализацией storage.
 * Idempotent: повторный запуск безопасен — drizzle отслеживает уже
 * применённые миграции в таблице __drizzle_migrations.
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

export function runMigrations(dbPath: string): void {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  // process.cwd() = /app в Docker; migrations копируются туда же через Dockerfile
  const migrationsFolder = path.resolve(process.cwd(), "migrations");

  try {
    migrate(db, { migrationsFolder });
    console.info("[migrate] All migrations applied successfully");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    sqlite.close();
  }
}

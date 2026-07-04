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

/**
 * Guard: run SQL only if the column/index doesn't exist yet.
 * Handles the edge-case where drizzle recorded the migration hash
 * in __drizzle_migrations but crashed before the DDL executed.
 */
function applyGuardedDDL(sqlite: InstanceType<typeof Database>): void {
  // 0005: deleted_at column on meals
  const mealCols = sqlite.pragma("table_info(meals)") as { name: string }[];
  if (!mealCols.some((c) => c.name === "deleted_at")) {
    console.info("[migrate] Applying guarded DDL: meals.deleted_at");
    sqlite.exec(
      "ALTER TABLE meals ADD COLUMN deleted_at text;" +
        "CREATE INDEX IF NOT EXISTS idx_meals_deleted_at ON meals(deleted_at) WHERE deleted_at IS NOT NULL;",
    );
  }

  // 0006: mfa_enabled + mfa_secret columns on users
  const userCols = sqlite.pragma("table_info(users)") as { name: string }[];
  if (!userCols.some((c) => c.name === "mfa_enabled")) {
    console.info("[migrate] Applying guarded DDL: users.mfa_enabled");
    sqlite.exec("ALTER TABLE users ADD COLUMN mfa_enabled integer NOT NULL DEFAULT 0;");
  }
  if (!userCols.some((c) => c.name === "mfa_secret")) {
    console.info("[migrate] Applying guarded DDL: users.mfa_secret");
    sqlite.exec("ALTER TABLE users ADD COLUMN mfa_secret text;");
  }
}

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
  }

  // Guarded DDL pass — repairs any migration whose hash was recorded
  // but whose DDL statements did not execute (e.g. crash mid-migration).
  try {
    applyGuardedDDL(sqlite);
  } catch (err) {
    console.error("[migrate] Guarded DDL failed:", err);
    throw err;
  } finally {
    sqlite.close();
  }
}

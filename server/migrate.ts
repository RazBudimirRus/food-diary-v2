/**
 * Versioned migrations via drizzle-kit (Phase 26.1) + guarded DDL (Phase 29.6 / BUG-03).
 *
 * Order on boot (v2.27+):
 * 1. `runMigrations(dbPath)` — drizzle migrator + `applyGuardedDDL`
 * 2. Then storage / repositories may open the DB (lazy Proxy in db.ts)
 *
 * Schema source of truth: `migrations/*.sql`. Guarded DDL only repairs partial applies
 * (column/table missing while drizzle hash was recorded). Add new columns via a migration
 * (+ guarded repair if prod may have a partial apply). Verify empty DB with
 * `npx tsx script/cold-start-check.ts`.
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

  // last_login_at: added in baseline but missing from pre-baseline DBs
  const userCols = sqlite.pragma("table_info(users)") as { name: string }[];
  if (!userCols.some((c) => c.name === "last_login_at")) {
    console.info("[migrate] Applying guarded DDL: users.last_login_at");
    sqlite.exec("ALTER TABLE users ADD COLUMN last_login_at text;");
  }
  // pd_consent_at: added in 0003 but may be missing if migration ran partially
  if (!userCols.some((c) => c.name === "pd_consent_at")) {
    console.info("[migrate] Applying guarded DDL: users.pd_consent_at");
    sqlite.exec("ALTER TABLE users ADD COLUMN pd_consent_at text;");
  }
  // 0006: mfa_enabled + mfa_secret columns on users
  if (!userCols.some((c) => c.name === "mfa_enabled")) {
    console.info("[migrate] Applying guarded DDL: users.mfa_enabled");
    sqlite.exec("ALTER TABLE users ADD COLUMN mfa_enabled integer NOT NULL DEFAULT 0;");
  }
  if (!userCols.some((c) => c.name === "mfa_secret")) {
    console.info("[migrate] Applying guarded DDL: users.mfa_secret");
    sqlite.exec("ALTER TABLE users ADD COLUMN mfa_secret text;");
  }

  // 0007: kbju_manual — manual КБЖУ priority flag
  const profileCols = sqlite.pragma("table_info(user_profiles)") as { name: string }[];
  if (!profileCols.some((c) => c.name === "kbju_manual")) {
    console.info("[migrate] Applying guarded DDL: user_profiles.kbju_manual");
    sqlite.exec("ALTER TABLE user_profiles ADD COLUMN kbju_manual integer NOT NULL DEFAULT 0;");
  }

  // 0008: water_ml — computed water intake in ml per meal (BUG-02)
  const mealColsV2 = sqlite.pragma("table_info(meals)") as { name: string }[];
  if (!mealColsV2.some((c) => c.name === "water_ml")) {
    console.info("[migrate] Applying guarded DDL: meals.water_ml");
    sqlite.exec("ALTER TABLE meals ADD COLUMN water_ml real;");
  }

  // 0009: client_errors table (retention 7 days)
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  if (!tables.some((t) => t.name === "client_errors")) {
    console.info("[migrate] Applying guarded DDL: client_errors table");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS client_errors (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        message     TEXT NOT NULL,
        stack       TEXT,
        url         TEXT,
        user_agent  TEXT,
        extra       TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors (created_at);
      CREATE INDEX IF NOT EXISTS idx_client_errors_user_id    ON client_errors (user_id);
    `);
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

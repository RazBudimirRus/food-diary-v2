import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigrations } from "../server/migrate";

const dir = mkdtempSync(join(tmpdir(), "fd-cold-"));
const dbPath = join(dir, "cold.db");

runMigrations(dbPath);

const db = new Database(dbPath);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((t) => (t as { name: string }).name);

const required = [
  "users",
  "meals",
  "days",
  "secrets",
  "refresh_tokens",
  "photos",
  "audit_log",
  "client_errors",
  "idempotency_keys",
  "food_catalog_items",
  "doctor_plans",
];

const missing = required.filter((t) => !tables.includes(t));
const mealCols = (db.pragma("table_info(meals)") as { name: string }[]).map((c) => c.name);
const userCols = (db.pragma("table_info(users)") as { name: string }[]).map((c) => c.name);

console.log("tables:", tables.join(", "));
console.log("meals:", mealCols.join(", "));
console.log("users:", userCols.join(", "));

if (missing.length) {
  console.error("MISSING TABLES:", missing.join(", "));
  process.exit(1);
}
for (const col of ["deleted_at", "water_ml"]) {
  if (!mealCols.includes(col)) {
    console.error("MISSING meal column:", col);
    process.exit(1);
  }
}
for (const col of ["mfa_enabled", "mfa_secret", "pd_consent_at", "last_login_at"]) {
  if (!userCols.includes(col)) {
    console.error("MISSING user column:", col);
    process.exit(1);
  }
}

db.close();
rmSync(dir, { recursive: true, force: true });
console.log("cold-start OK");

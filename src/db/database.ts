import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Database = DatabaseSync;

export function openDatabase(filename: string): Database {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON;");
  if (filename !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL;");
  }
  runMigrations(database);
  return database;
}

function runMigrations(database: Database): void {
  const migrationDirectory = path.resolve(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql")).sort();
  database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const alreadyApplied = database.prepare("SELECT 1 FROM schema_migrations WHERE version = ?");
  const recordMigration = database.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)");

  for (const file of files) {
    if (alreadyApplied.get(file)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(fs.readFileSync(path.join(migrationDirectory, file), "utf8"));
      recordMigration.run(file, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

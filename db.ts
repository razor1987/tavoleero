// Dual-backend database init for Tavoleero standalone.
//
// - If DATABASE_URL is set: Postgres via node-postgres Pool +
//   drizzle-orm/node-postgres. The schema (./migrations-pg/0001_schema.sql)
//   is applied idempotently at boot.
// - Otherwise, or if Postgres is unreachable: local SQLite via bun:sqlite,
//   exactly as before (dev fallback; on Render free this was ephemeral).
//
// The prebuilt action bundle (vendor/actions.js) was compiled against the
// drizzle sqlite-core schema (sqliteTable). The drizzle query builder
// generates SQL from the session dialect, so the same table objects work
// against Postgres as long as driver values look like SQLite's: ids and
// timestamps stay JS numbers (pg returns BIGINT as string by default, hence
// the type-parser override below), booleans are INTEGER 0/1 (mirrored in the
// Postgres DDL), timestamps are BIGINT millis. No game/auth logic changes.

import { Database } from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// node-postgres returns BIGINT (int8, OID 20) as string; the bundled schema
// maps timestamp_ms columns with `new Date(value)`, which needs a number.
types.setTypeParser(20, (value: string) => parseInt(value, 10));

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "migrations");
const PG_SCHEMA_FILE = join(HERE, "migrations-pg", "0001_schema.sql");

const DB_PATH = process.env.DB_PATH || "./tavoleero.db";

export interface DbInit {
  db: any;
  backend: "postgres" | "sqlite";
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: timeout dopo ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function initDb(injectedPool?: any): Promise<DbInit> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  // injectedPool is a test seam (pg-mem); never used in production.
  if (databaseUrl || injectedPool) {
    try {
      let pool: any;
      if (injectedPool) {
        pool = injectedPool;
      } else {
        // Supabase richiede TLS. Lo abilitiamo di default, salvo ?sslmode=disable
        // esplicito nell'URL (utile per un Postgres locale di sviluppo).
        const tlsDisabled = /([?&])sslmode=disable(&|$)/i.test(databaseUrl!);
        pool = new Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
          ...(tlsDisabled ? {} : { ssl: { rejectUnauthorized: false } }),
        });
        pool.on("error", (err: any) => {
          console.error(`[db] errore pool postgres: ${err?.message ?? err}`);
        });
      }
      await withTimeout(pool.query("SELECT 1"), 15000, "controllo connessione postgres");
      const schemaSql = readFileSync(PG_SCHEMA_FILE, "utf8");
      await withTimeout(pool.query(schemaSql), 30000, "creazione schema postgres");
      console.log("DB backend: postgres");
      return { db: drizzlePg(pool), backend: "postgres" };
    } catch (err: any) {
      // Mai far cadere il sito per il DB: log chiaro e ripiego su SQLite.
      console.error(
        `[db] Postgres non raggiungibile (${err?.message ?? err}). Ripiego su SQLite: il sito resta su, ma i dati torneranno effimeri.`,
      );
    }
  }

  const sqlite = new Database(DB_PATH);
  sqlite.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)");
  const applied = new Set(
    (sqlite.query("SELECT name FROM _migrations").all() as { name: string }[]).map((r) => r.name),
  );
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    sqlite.query("INSERT INTO _migrations (name) VALUES (?)").run(file);
    console.log(`applied migration ${file}`);
  }
  console.log(`DB backend: sqlite (fallback) (db=${DB_PATH})`);
  return { db: drizzleSqlite(sqlite), backend: "sqlite" };
}

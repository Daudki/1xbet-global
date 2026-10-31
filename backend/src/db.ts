import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { env } from "./env.js"
import { seedFirstAdmin } from "./lib/seed.js"

const useSsl = env.DATABASE_SSL ? env.DATABASE_SSL === "true" : env.NODE_ENV === "production"

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
})

pool.on("error", (err) => console.error("Unexpected database error", err))

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url)

async function migrate() {
  const client = await pool.connect()
  try {
    // One instance migrates at a time.
    await client.query("SELECT pg_advisory_lock(727274)")
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    )
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name))
    const files = (await readdir(fileURLToPath(MIGRATIONS_DIR))).filter((f) => f.endsWith(".sql")).sort()

    for (const file of files) {
      if (done.has(file)) continue
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8")
      await client.query("BEGIN")
      try {
        await client.query(sql)
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file])
        await client.query("COMMIT")
        console.log(`migration applied: ${file}`)
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727274)").catch(() => undefined)
    client.release()
  }
}

let ready: Promise<void> | null = null

/** Runs migrations and seeds the first admin, once per process. */
export function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await migrate()
      await seedFirstAdmin()
    })()
    ready.catch(() => {
      ready = null // allow a retry on the next request
    })
  }
  return ready
}

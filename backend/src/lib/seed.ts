import { pool } from "../db.js"
import { env } from "../env.js"
import { hashPassword } from "./auth.js"

/** Creates the first admin from ADMIN_* env vars, only while the users table is empty. */
export async function seedFirstAdmin() {
  const { rows } = await pool.query("SELECT 1 FROM users LIMIT 1")
  if (rows.length > 0) return

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.warn("No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.")
    return
  }
  if (env.ADMIN_PASSWORD.length < 10) {
    console.warn("ADMIN_PASSWORD must be at least 10 characters. First admin not created.")
    return
  }

  await pool.query(
    "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')",
    [env.ADMIN_EMAIL.trim().toLowerCase(), env.ADMIN_NAME.trim() || "Admin", await hashPassword(env.ADMIN_PASSWORD)],
  )
  console.log(`First admin created: ${env.ADMIN_EMAIL.trim().toLowerCase()}`)
}

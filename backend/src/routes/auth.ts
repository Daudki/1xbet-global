import { Router } from "express"
import rateLimit from "express-rate-limit"
import { z } from "zod"
import { pool } from "../db.js"
import {
  DUMMY_HASH,
  hashPassword,
  publicUser,
  signToken,
  toAuthUser,
  verifyPassword,
  type UserRow,
} from "../lib/auth.js"
import { HttpError } from "../lib/http.js"
import { requireAuthLoose } from "../middleware/auth.js"

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, message: "Too many sign-in attempts. Please wait a few minutes and try again." },
})

const loginBody = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(128),
})

authRouter.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = loginBody.parse(req.body)

  const { rows } = await pool.query<UserRow & { password_hash: string }>(
    "SELECT id, email, name, role, active, must_change_password, token_version, password_hash FROM users WHERE lower(email) = $1",
    [email],
  )
  const row = rows[0]
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !valid) throw new HttpError(401, "Incorrect email or password.")
  if (!row.active) throw new HttpError(403, "This account has been disabled. Please ask an admin.")

  await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [row.id])
  const user = toAuthUser(row)
  res.json({ ok: true, token: signToken(user), user: publicUser(user) })
})

authRouter.get("/auth/me", requireAuthLoose, (req, res) => {
  res.json({ ok: true, user: publicUser(req.user!) })
})

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10, "Use at least 10 characters.").max(128),
})

authRouter.post("/auth/change-password", requireAuthLoose, async (req, res) => {
  const { currentPassword, newPassword } = passwordBody.parse(req.body)
  const me = req.user!

  const { rows } = await pool.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [me.id])
  if (!(await verifyPassword(currentPassword, rows[0].password_hash))) {
    throw new HttpError(400, "Your current password is incorrect.")
  }
  if (currentPassword === newPassword) throw new HttpError(400, "Choose a password you haven't used just now.")

  const updated = await pool.query<UserRow>(
    `UPDATE users
        SET password_hash = $2, must_change_password = false, token_version = token_version + 1
      WHERE id = $1
  RETURNING id, email, name, role, active, must_change_password, token_version`,
    [me.id, await hashPassword(newPassword)],
  )
  const user = toAuthUser(updated.rows[0])
  // Old tokens stop working, so hand back a fresh one.
  res.json({ ok: true, token: signToken(user), user: publicUser(user) })
})

import { Router } from "express"
import { z } from "zod"
import { pool } from "../db.js"
import { generateTempPassword, hashPassword } from "../lib/auth.js"
import { HttpError, isUuid } from "../lib/http.js"
import { requireAdmin, requireAuth } from "../middleware/auth.js"

export const adminRouter = Router()

adminRouter.use("/admin", requireAuth, requireAdmin)

/** The owner account is invisible to, and unmanageable by, every other admin. */
async function viewerIsOwner(userId: string) {
  const { rows } = await pool.query<{ is_owner: boolean }>("SELECT is_owner FROM users WHERE id = $1", [userId])
  return rows[0]?.is_owner === true
}

interface AdminUserRow {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  active: boolean
  must_change_password: boolean
  created_at: Date
  last_login_at: Date | null
  post_count: number
  avatar_url: string | null
}

const USER_COLUMNS = `u.id, u.email, u.name, u.role, u.active, u.must_change_password, u.created_at, u.last_login_at, u.avatar_url,
  (SELECT count(*)::int FROM articles i WHERE i.author_id = u.id) AS post_count`

const toAdminUser = (r: AdminUserRow) => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  active: r.active,
  mustChangePassword: r.must_change_password,
  createdAt: r.created_at.toISOString(),
  lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
  postCount: r.post_count,
  avatarUrl: r.avatar_url,
})

adminRouter.get("/admin/users", async (req, res) => {
  const owner = await viewerIsOwner(req.user!.id)
  const { rows } = await pool.query<AdminUserRow>(
    `SELECT ${USER_COLUMNS} FROM users u WHERE ($1 OR NOT u.is_owner) ORDER BY u.created_at ASC`,
    [owner],
  )
  res.json({ ok: true, users: rows.map(toAdminUser) })
})

const createBody = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  role: z.enum(["admin", "user"]).default("user"),
})

// The new person gets a one-time temporary password and must choose their own at first sign-in.
adminRouter.post("/admin/users", async (req, res) => {
  const data = createBody.parse(req.body)
  const temporaryPassword = generateTempPassword()

  try {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO users (email, name, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [data.email, data.name, await hashPassword(temporaryPassword), data.role],
    )
    const { rows } = await pool.query<AdminUserRow>(`SELECT ${USER_COLUMNS} FROM users u WHERE u.id = $1`, [
      inserted.rows[0].id,
    ])
    res.status(201).json({ ok: true, user: toAdminUser(rows[0]), temporaryPassword })
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "Someone already uses that email.")
    throw err
  }
})

const patchBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    role: z.enum(["admin", "user"]).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.")

adminRouter.patch("/admin/users/:id", async (req, res) => {
  const id = String(req.params.id)
  if (!isUuid(id)) throw new HttpError(404, "User not found.")
  const data = patchBody.parse(req.body)

  // Stops you locking yourself out; another admin can still change your access.
  if (id === req.user!.id && (data.role !== undefined || data.active !== undefined)) {
    throw new HttpError(400, "You can't change your own role or disable your own account.")
  }

  const { rows } = await pool.query<{ id: string }>(
    `UPDATE users
        SET name = COALESCE($2, name),
            role = COALESCE($3, role),
            active = COALESCE($4, active),
            token_version = CASE WHEN $4 = false THEN token_version + 1 ELSE token_version END
      WHERE id = $1 AND ($5 OR NOT is_owner)
  RETURNING id`,
    [id, data.name ?? null, data.role ?? null, data.active ?? null, await viewerIsOwner(req.user!.id)],
  )
  if (!rows[0]) throw new HttpError(404, "User not found.")

  const out = await pool.query<AdminUserRow>(`SELECT ${USER_COLUMNS} FROM users u WHERE u.id = $1`, [id])
  res.json({ ok: true, user: toAdminUser(out.rows[0]) })
})

adminRouter.post("/admin/users/:id/reset-password", async (req, res) => {
  const id = String(req.params.id)
  if (!isUuid(id)) throw new HttpError(404, "User not found.")
  if (id === req.user!.id) throw new HttpError(400, "Use Account to change your own password.")

  const temporaryPassword = generateTempPassword()
  const { rowCount } = await pool.query(
    `UPDATE users
        SET password_hash = $2, must_change_password = true, token_version = token_version + 1
      WHERE id = $1 AND ($3 OR NOT is_owner)`,
    [id, await hashPassword(temporaryPassword), await viewerIsOwner(req.user!.id)],
  )
  if (!rowCount) throw new HttpError(404, "User not found.")
  res.json({ ok: true, temporaryPassword })
})

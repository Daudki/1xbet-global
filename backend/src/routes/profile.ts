import { Router } from "express"
import { z } from "zod"
import { pool } from "../db.js"
import { destroyImages, isOwnUpload } from "../lib/cloudinary.js"
import { HttpError } from "../lib/http.js"
import { requireAuth } from "../middleware/auth.js"

export const profileRouter = Router()

interface Row {
  id: string
  email: string
  name: string
  role: "admin" | "user"
  bio: string
  avatar_url: string | null
  avatar_public_id: string | null
}

const SELECT = "SELECT id, email, name, role, bio, avatar_url, avatar_public_id FROM users WHERE id = $1"

const toProfile = (r: Row) => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  bio: r.bio,
  avatar: r.avatar_url && r.avatar_public_id ? { url: r.avatar_url, publicId: r.avatar_public_id } : null,
})

profileRouter.get("/profile", requireAuth, async (req, res) => {
  const { rows } = await pool.query<Row>(SELECT, [req.user!.id])
  res.json({ ok: true, profile: toProfile(rows[0]) })
})

const body = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters.").default(""),
  avatar: z.object({ publicId: z.string().max(300), url: z.url().max(500) }).nullable().default(null),
})

profileRouter.patch("/profile", requireAuth, async (req, res) => {
  const me = req.user!
  const v = body.parse(req.body)
  const { rows: before } = await pool.query<Row>(SELECT, [me.id])
  const oldId = before[0].avatar_public_id
  const changed = (v.avatar?.publicId ?? null) !== oldId
  if (changed && v.avatar && !isOwnUpload({ ...v.avatar, width: 0, height: 0 }, me.id)) {
    throw new HttpError(400, "That picture wasn't uploaded by you.")
  }
  const { rows } = await pool.query<Row>(
    `UPDATE users SET name = $2, bio = $3, avatar_url = $4, avatar_public_id = $5 WHERE id = $1
     RETURNING id, email, name, role, bio, avatar_url, avatar_public_id`,
    [me.id, v.name, v.bio, v.avatar?.url ?? null, v.avatar?.publicId ?? null],
  )
  if (changed && oldId) void destroyImages([oldId])
  res.json({ ok: true, profile: toProfile(rows[0]) })
})

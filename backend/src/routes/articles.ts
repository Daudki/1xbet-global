import { Router } from "express"
import { z } from "zod"
import { pool } from "../db.js"
import { env } from "../env.js"
import { destroyImages, isOwnUpload } from "../lib/cloudinary.js"
import { HttpError, isUuid } from "../lib/http.js"
import { requireAuth } from "../middleware/auth.js"

export const articlesRouter = Router()

interface Row {
  id: string
  author_id: string
  author_name: string
  slug: string
  title: string
  description: string
  category: string
  body: string
  status: "draft" | "published"
  cover_url: string | null
  cover_public_id: string | null
  created_at: Date
  updated_at: Date | null
  published_at: Date | null
}

const COLUMNS = `a.id, a.author_id, u.name AS author_name, a.slug, a.title, a.description, a.category, a.body,
  a.status, a.cover_url, a.cover_public_id, a.created_at, a.updated_at, a.published_at`
const FROM = "FROM articles a JOIN users u ON u.id = a.author_id"

const toItem = (r: Row, withBody: boolean) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  category: r.category,
  status: r.status,
  cover: r.cover_url && r.cover_public_id ? { url: r.cover_url, publicId: r.cover_public_id } : null,
  author: r.author_name,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at?.toISOString() ?? null,
  publishedAt: r.published_at?.toISOString() ?? null,
  ...(withBody ? { body: r.body } : {}),
})

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/, "")

/** Asks Vercel to rebuild the public site so new or changed articles are pre-rendered. */
function rebuildSite() {
  if (!env.DEPLOY_HOOK_URL) return
  fetch(env.DEPLOY_HOOK_URL, { method: "POST", signal: AbortSignal.timeout(8000) }).catch((err) =>
    console.warn("Deploy hook failed:", (err as Error).message),
  )
}

// ---------- Public (read-only) ----------

articlesRouter.get("/articles", async (req, res) => {
  const full = req.query.full === "1"
  const { rows } = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM} WHERE a.status = 'published' ORDER BY a.published_at DESC LIMIT 1000`,
  )
  res.set("Cache-Control", "public, max-age=60")
  res.json({ ok: true, articles: rows.map((r) => toItem(r, full)) })
})

articlesRouter.get("/articles/:slug", async (req, res) => {
  const { rows } = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM} WHERE a.slug = $1 AND a.status = 'published'`,
    [req.params.slug],
  )
  if (!rows[0]) throw new HttpError(404, "Article not found.")
  res.set("Cache-Control", "public, max-age=60")
  res.json({ ok: true, article: toItem(rows[0], true) })
})

// ---------- Signed-in writers ----------

const body = z
  .object({
    title: z.string().trim().min(3, "Enter a title.").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(90)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use only letters, numbers and single dashes in the URL.")
      .default(""),
    description: z.string().trim().max(200, "Keep the description under 200 characters.").default(""),
    category: z.string().trim().min(1).max(60).default("Guides"),
    body: z.string().max(100_000).default(""),
    status: z.enum(["draft", "published"]).default("draft"),
    cover: z.object({ publicId: z.string().max(300), url: z.url().max(500) }).nullable().default(null),
  })
  .refine((v) => v.status === "draft" || (v.description && v.body.trim()), {
    message: "Add a description and some text before publishing.",
  })

function canEdit(row: { author_id: string }, user: { id: string; role: string }) {
  return user.role === "admin" || row.author_id === user.id
}

async function load(id: string) {
  if (!isUuid(id)) throw new HttpError(404, "Article not found.")
  const { rows } = await pool.query<Row>(`SELECT ${COLUMNS} ${FROM} WHERE a.id = $1`, [id])
  if (!rows[0]) throw new HttpError(404, "Article not found.")
  return rows[0]
}

articlesRouter.get("/manage/articles", requireAuth, async (req, res) => {
  const me = req.user!
  const { rows } = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM} WHERE ($1 OR a.author_id = $2) ORDER BY a.created_at DESC LIMIT 500`,
    [me.role === "admin", me.id],
  )
  res.json({ ok: true, articles: rows.map((r) => toItem(r, false)) })
})

articlesRouter.get("/manage/articles/:id", requireAuth, async (req, res) => {
  const row = await load(req.params.id as string)
  if (!canEdit(row, req.user!)) throw new HttpError(403, "You can only edit your own articles.")
  res.json({ ok: true, article: toItem(row, true) })
})

const isDup = (err: unknown) => (err as { code?: string })?.code === "23505"

articlesRouter.post("/manage/articles", requireAuth, async (req, res) => {
  const me = req.user!
  const v = body.parse(req.body)
  const slug = v.slug || slugify(v.title)
  if (!slug) throw new HttpError(400, "Enter a title with letters or numbers.")
  if (v.cover && !isOwnUpload({ ...v.cover, width: 0, height: 0 }, me.id)) {
    throw new HttpError(400, "That cover image wasn't uploaded by you.")
  }
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO articles (author_id, slug, title, description, category, body, status, cover_url, cover_public_id, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $7 = 'published' THEN now() END) RETURNING id`,
      [me.id, slug, v.title, v.description, v.category, v.body, v.status, v.cover?.url ?? null, v.cover?.publicId ?? null],
    )
    if (v.status === "published") rebuildSite()
    res.status(201).json({ ok: true, article: toItem(await load(rows[0].id), true) })
  } catch (err) {
    if (isDup(err)) throw new HttpError(409, "That URL is already used by another article. Change the URL.")
    throw err
  }
})

articlesRouter.patch("/manage/articles/:id", requireAuth, async (req, res) => {
  const me = req.user!
  const old = await load(req.params.id as string)
  if (!canEdit(old, me)) throw new HttpError(403, "You can only edit your own articles.")
  const v = body.parse(req.body)
  const slug = v.slug || old.slug
  const coverChanged = (v.cover?.publicId ?? null) !== old.cover_public_id
  if (coverChanged && v.cover && !isOwnUpload({ ...v.cover, width: 0, height: 0 }, me.id)) {
    throw new HttpError(400, "That cover image wasn't uploaded by you.")
  }
  try {
    await pool.query(
      `UPDATE articles SET slug=$2, title=$3, description=$4, category=$5, body=$6, status=$7,
         cover_url=$8, cover_public_id=$9, updated_at=now(),
         published_at = CASE WHEN $7 = 'published' AND published_at IS NULL THEN now() ELSE published_at END
       WHERE id = $1`,
      [old.id, slug, v.title, v.description, v.category, v.body, v.status, v.cover?.url ?? null, v.cover?.publicId ?? null],
    )
  } catch (err) {
    if (isDup(err)) throw new HttpError(409, "That URL is already used by another article. Change the URL.")
    throw err
  }
  if (coverChanged && old.cover_public_id) void destroyImages([old.cover_public_id])
  if (v.status === "published" || old.status === "published") rebuildSite()
  res.json({ ok: true, article: toItem(await load(old.id), true) })
})

articlesRouter.delete("/manage/articles/:id", requireAuth, async (req, res) => {
  const old = await load(req.params.id as string)
  if (!canEdit(old, req.user!)) throw new HttpError(403, "You can only delete your own articles.")
  await pool.query("DELETE FROM articles WHERE id = $1", [old.id])
  if (old.cover_public_id) void destroyImages([old.cover_public_id])
  if (old.status === "published") rebuildSite()
  res.json({ ok: true })
})

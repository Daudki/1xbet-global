import "dotenv/config"
import { randomBytes } from "node:crypto"
import { z } from "zod"

const DATABASE_URL_HELP =
  "DATABASE_URL must look like postgres://USER:PASSWORD@HOST:5432/DBNAME. " +
  "If the password has special characters such as # / ? @ : or %, replace each one with its percent code (for example # becomes %23)."

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value)
    const hasHost = url.hostname !== "" || url.searchParams.has("host") // the second form is a unix socket
    return (url.protocol === "postgres:" || url.protocol === "postgresql:") && hasHost && url.pathname.length > 1
  } catch {
    return false
  }
}

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),

  // Database and auth
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    // Pasted values often carry stray spaces or quotes.
    .transform((v) => v.trim().replace(/^(["'])(.*)\1$/, "$2").trim())
    .refine(isPostgresUrl, DATABASE_URL_HELP),
  // Empty means "decide automatically" (on in production, off elsewhere).
  DATABASE_SSL: z.enum(["true", "false", ""]).optional(),
  JWT_SECRET: z.string().optional().default(""),
  JWT_EXPIRES_IN: z.string().default("12h"),

  // Image uploads (Cloudinary). Leave empty to turn image uploads off.
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_FOLDER: z.string().default("sportsbet/articles"),

  // Optional: Vercel deploy hook URL. Publishing an article calls it so the site rebuilds.
  DEPLOY_HOOK_URL: z.string().optional().default(""),

  // Used once, to create the first admin when the users table is empty.
  ADMIN_EMAIL: z.string().optional().default(""),
  ADMIN_NAME: z.string().optional().default("Admin"),
  ADMIN_PASSWORD: z.string().optional().default(""),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error("Invalid environment:", z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data

if (env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random string of at least 32 characters in production.")
  process.exit(1)
}

// In development a missing secret gets a random one per run (logins reset on restart).
export const jwtSecret = env.JWT_SECRET || randomBytes(32).toString("hex")
if (!env.JWT_SECRET) console.warn("JWT_SECRET not set: using a temporary secret for this run.")

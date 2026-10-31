import express from "express"
import cors from "cors"
import helmet from "helmet"
import { env } from "./env.js"
import { ensureReady } from "./db.js"
import { errorHandler } from "./lib/http.js"
import { authRouter } from "./routes/auth.js"
import { articlesRouter } from "./routes/articles.js"
import { uploadsRouter } from "./routes/uploads.js"
import { adminRouter } from "./routes/admin.js"

const app = express()
app.set("trust proxy", 1) // correct client IPs behind Render/Railway/Fly for rate limiting

const origins = env.FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)

app.use(helmet())
app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
app.use(express.json({ limit: "1mb" }))

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

// Migrations and first-admin seeding run once; also covers serverless cold starts.
app.use(async (_req, _res, next) => {
  await ensureReady()
  next()
})

app.use("/api", authRouter)
app.use("/api", articlesRouter)
app.use("/api", uploadsRouter)
app.use("/api", adminRouter)

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: "Not found" })
})

app.use(errorHandler)

export default app

import app from "./app.js"
import { ensureReady } from "./db.js"
import { env } from "./env.js"

// Fail fast if the database or migrations are broken, before accepting traffic.
await ensureReady().catch((err) => {
  console.error("Startup failed:", err)
  process.exit(1)
})

app.listen(env.PORT, () => {
  console.log(`sportsbet-api on :${env.PORT}`)
})

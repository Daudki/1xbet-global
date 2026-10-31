import { Router } from "express"
import rateLimit from "express-rate-limit"
import { HttpError } from "../lib/http.js"
import { imagesEnabled, uploadTicket } from "../lib/cloudinary.js"
import { requireAuth } from "../middleware/auth.js"

export const uploadsRouter = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, message: "Too many uploads. Please try again later." },
})

// Signed-in people ask for permission to upload; the file itself goes straight to Cloudinary.
uploadsRouter.post("/uploads/sign", requireAuth, limiter, (req, res) => {
  if (!imagesEnabled) throw new HttpError(503, "Image uploads aren't set up yet.", "IMAGES_DISABLED")
  res.json({ ok: true, ...uploadTicket(req.user!.id) })
})

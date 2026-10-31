import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ ok: false, message: err.message, code: err.code })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, message: err.issues[0]?.message ?? "Invalid request." })
    return
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ ok: false, message: "Invalid JSON." })
    return
  }
  console.error(err)
  res.status(500).json({ ok: false, message: "Something went wrong on our side. Please try again." })
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

import type { NextFunction, Request, Response } from "express"
import { pool } from "../db.js"
import { readToken, toAuthUser, type AuthUser, type UserRow } from "../lib/auth.js"
import { HttpError } from "../lib/http.js"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

async function authenticate(req: Request) {
  const header = req.headers.authorization ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  const claims = token ? readToken(token) : null
  if (!claims) throw new HttpError(401, "Please sign in.", "UNAUTHENTICATED")

  const { rows } = await pool.query<UserRow>(
    "SELECT id, email, name, role, active, must_change_password, token_version FROM users WHERE id = $1",
    [claims.sub],
  )
  const user = rows[0] ? toAuthUser(rows[0]) : null
  if (!user || !user.active || user.tokenVersion !== claims.tv) {
    throw new HttpError(401, "Your session has ended. Please sign in again.", "UNAUTHENTICATED")
  }
  req.user = user
  return user
}

/** Signed-in users only. Blocks accounts that still have to choose a new password. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await authenticate(req)
  if (user.mustChangePassword) {
    throw new HttpError(403, "Please choose a new password first.", "PASSWORD_CHANGE_REQUIRED")
  }
  next()
}

/** Signed-in users, even if they still have to change their password (me, change-password). */
export async function requireAuthLoose(req: Request, _res: Response, next: NextFunction) {
  await authenticate(req)
  next()
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") throw new HttpError(403, "Admins only.", "FORBIDDEN")
  next()
}

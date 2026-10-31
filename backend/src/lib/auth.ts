import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { randomInt } from "node:crypto"
import { env, jwtSecret } from "../env.js"

export type Role = "admin" | "user"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
  mustChangePassword: boolean
  tokenVersion: number
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12)

export function signToken(user: Pick<AuthUser, "id" | "tokenVersion">) {
  return jwt.sign({ sub: user.id, tv: user.tokenVersion }, jwtSecret, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  })
}

export function readToken(token: string): { sub: string; tv: number } | null {
  try {
    const payload = jwt.verify(token, jwtSecret)
    if (typeof payload === "object" && typeof payload.sub === "string" && typeof payload.tv === "number") {
      return { sub: payload.sub, tv: payload.tv }
    }
    return null
  } catch {
    return null
  }
}

// No look-alike characters (0/O, 1/l/I) so it is easy to read out or type.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export function generateTempPassword(length = 14) {
  let out = ""
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export interface UserRow {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
  must_change_password: boolean
  token_version: number
}

export const toAuthUser = (r: UserRow): AuthUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  active: r.active,
  mustChangePassword: r.must_change_password,
  tokenVersion: r.token_version,
})

export const publicUser = (u: AuthUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
})

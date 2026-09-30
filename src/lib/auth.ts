import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Database } from "../db/database.js";
import { ApiError } from "./errors.js";

export type User = { id: string; email: string; displayName: string; role: "member" | "admin"; showEmail: boolean; showPhone: boolean };
export type AuthenticatedRequest = Request & { user?: User };
const COOKIE_NAME = "pp_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [, salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function toUser(row: Record<string, unknown>): User {
  return { id: String(row.id), email: String(row.email), displayName: String(row.display_name), role: row.role === "admin" ? "admin" : "member", showEmail: Boolean(row.show_email), showPhone: Boolean(row.show_phone) };
}

export function getSessionUser(database: Database, request: Request): User | null {
  const token = request.headers.cookie?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const row = database.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).get(hash, new Date().toISOString()) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function requireUser(database: Database) {
  return (request: AuthenticatedRequest, _response: Response, next: NextFunction): void => {
    const user = getSessionUser(database, request);
    if (!user) { next(new ApiError(401, "authentication_required", "Sign in to continue.")); return; }
    request.user = user;
    next();
  };
}

export function requireAdmin(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
  if (request.user?.role !== "admin") { next(new ApiError(403, "admin_required", "Administrator access is required.")); return; }
  next();
}

export function setSessionCookie(response: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
}

export function clearSessionCookie(response: Response): void {
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

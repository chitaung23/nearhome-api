import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { clearSessionCookie, getSessionUser, setSessionCookie, verifyPassword } from "../lib/auth.js";
import { ApiError } from "../lib/errors.js";

const credentials = z.object({ email: z.string().email().transform((email) => email.toLowerCase()), password: z.string().min(8).max(128) });

export function createAuthRouter(database: Database): Router {
  const router = Router();
  router.post("/login", (request, response) => {
    const input = credentials.parse(request.body);
    const row = database.prepare("SELECT * FROM users WHERE email = ?").get(input.email) as Record<string, unknown> | undefined;
    if (!row || !verifyPassword(input.password, String(row.password_hash))) throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
    const token = crypto.randomBytes(32).toString("base64url");
    database.prepare("INSERT INTO sessions(id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), String(row.id), crypto.createHash("sha256").update(token).digest("hex"), new Date(Date.now() + 7 * 86_400_000).toISOString(), new Date().toISOString());
    setSessionCookie(response, token);
    response.json({ data: { id: row.id, email: row.email, displayName: row.display_name, role: row.role } });
  });
  router.get("/me", (request, response) => {
    const user = getSessionUser(database, request);
    if (!user) throw new ApiError(401, "authentication_required", "Sign in to continue.");
    response.json({ data: user });
  });
  router.post("/logout", (request, response) => {
    const token = request.headers.cookie?.match(/pp_session=([^;]+)/)?.[1];
    if (token) database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(crypto.createHash("sha256").update(token).digest("hex"));
    clearSessionCookie(response);
    response.status(204).send();
  });
  return router;
}

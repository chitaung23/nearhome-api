import { Router } from "express";
import type { Database } from "../db/database.js";
import { requireAdmin, requireUser, type AuthenticatedRequest } from "../lib/auth.js";
import { ApiError } from "../lib/errors.js";

export function createAdminRouter(database: Database): Router {
  const router = Router(); router.use(requireUser(database), requireAdmin);
  router.get("/listings", (_request, response) => { const rows = database.prepare("SELECT l.*, u.email AS owner_email, u.display_name AS owner_name FROM listings l JOIN users u ON u.id = l.owner_id ORDER BY l.updated_at DESC").all(); response.json({ data: rows }); });
  router.patch("/listings/:id/status", (request: AuthenticatedRequest, response) => { const id = String(request.params.id); const status = String(request.body?.status ?? ""); if (!["published", "unpublished", "hidden", "archived"].includes(status)) throw new ApiError(400, "invalid_status", "Unsupported moderation status."); const result = database.prepare("UPDATE listings SET status=?, updated_at=? WHERE id=?").run(status, new Date().toISOString(), id); if (Number(result.changes) !== 1) throw new ApiError(404, "listing_not_found", "The listing was not found."); response.json({ data: { id, status } }); });
  return router;
}

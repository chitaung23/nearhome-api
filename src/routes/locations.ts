import { Router } from "express";
import type { Database } from "../db/database.js";

export function createLocationsRouter(database: Database): Router {
  const router = Router();
  router.get("/", (_request, response) => {
    const rows = database.prepare("SELECT code, label, townships_json FROM locations ORDER BY label").all() as Array<{ code: string; label: string; townships_json: string }>;
    response.json({ data: rows.map((row) => ({ code: row.code, label: row.label, townships: JSON.parse(row.townships_json) })) });
  });
  return router;
}

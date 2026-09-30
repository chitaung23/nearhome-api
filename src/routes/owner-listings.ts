import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { requireUser, type AuthenticatedRequest } from "../lib/auth.js";
import { ApiError } from "../lib/errors.js";

const listingInput = z.object({
  purpose: z.enum(["sale", "rent"]), title: z.string().trim().min(5).max(120), description: z.string().trim().min(20).max(5000),
  propertyType: z.enum(["apartment", "condo", "house", "land", "commercial"]), locationCode: z.enum(["yangon", "mandalay", "bago"]), township: z.string().trim().max(80).nullable().optional(),
  priceMmk: z.number().int().positive(), rentPeriod: z.literal("month").nullable().optional(), areaValue: z.number().positive(), areaUnit: z.enum(["sqft", "sqm"]), bedrooms: z.number().int().nonnegative().nullable().optional(), bathrooms: z.number().int().nonnegative().nullable().optional(), contactPreference: z.enum(["email", "phone", "both"]),
});

function mapOwnerListing(row: Record<string, unknown>) { return { id: row.id, ownerId: row.owner_id, purpose: row.purpose, status: row.status, title: row.title, description: row.description, propertyType: row.property_type, locationCode: row.location_code, township: row.township, priceMmk: row.price_mmk, rentPeriod: row.rent_period, areaValue: row.area_value, areaUnit: row.area_unit, bedrooms: row.bedrooms, bathrooms: row.bathrooms, contactPreference: row.contact_preference, isDemo: Boolean(row.is_demo), createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at }; }

function findOwned(database: Database, userId: string, id: string): Record<string, unknown> {
  const row = database.prepare("SELECT * FROM listings WHERE id = ? AND owner_id = ?").get(id, userId) as Record<string, unknown> | undefined;
  if (!row) throw new ApiError(404, "listing_not_found", "The listing was not found in your account.");
  return row;
}

export function createOwnerListingsRouter(database: Database): Router {
  const router = Router();
  router.use(requireUser(database));
  router.get("/", (request: AuthenticatedRequest, response) => { const rows = database.prepare("SELECT * FROM listings WHERE owner_id = ? ORDER BY updated_at DESC").all(request.user!.id) as Record<string, unknown>[]; response.json({ data: rows.map(mapOwnerListing) }); });
  router.post("/", (request: AuthenticatedRequest, response) => {
    const input = listingInput.parse(request.body); const id = crypto.randomUUID(); const now = new Date().toISOString();
    if (input.purpose === "rent" && input.rentPeriod !== "month") throw new ApiError(400, "rent_period_required", "Rental listings require a monthly billing period.");
    database.prepare(`INSERT INTO listings (id, owner_id, purpose, status, title, description, property_type, location_code, township, price_mmk, rent_period, area_value, area_unit, bedrooms, bathrooms, contact_preference, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, request.user!.id, input.purpose, input.title, input.description, input.propertyType, input.locationCode, input.township ?? null, input.priceMmk, input.purpose === "rent" ? "month" : null, input.areaValue, input.areaUnit, input.bedrooms ?? null, input.bathrooms ?? null, input.contactPreference, now, now);
    response.status(201).json({ data: mapOwnerListing(findOwned(database, request.user!.id, id)) });
  });
  router.patch("/:id", (request: AuthenticatedRequest, response) => {
    const id = String(request.params.id); const input = listingInput.partial().parse(request.body); const existing = findOwned(database, request.user!.id, id); const merged = { ...existing, ...Object.fromEntries(Object.entries(input).map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value])) } as Record<string, any>; const now = new Date().toISOString();
    database.prepare(`UPDATE listings SET purpose=?, title=?, description=?, property_type=?, location_code=?, township=?, price_mmk=?, rent_period=?, area_value=?, area_unit=?, bedrooms=?, bathrooms=?, contact_preference=?, updated_at=? WHERE id=? AND owner_id=?`).run(merged.purpose, merged.title, merged.description, merged.property_type, merged.location_code, merged.township ?? null, merged.price_mmk, merged.rent_period ?? null, merged.area_value, merged.area_unit, merged.bedrooms ?? null, merged.bathrooms ?? null, merged.contact_preference, now, id, request.user!.id);
    response.json({ data: mapOwnerListing(findOwned(database, request.user!.id, id)) });
  });
  router.post("/:id/images", (request: AuthenticatedRequest, response) => {
    const id = String(request.params.id); findOwned(database, request.user!.id, id);
    const input = z.object({ url: z.string().url().max(2000), altText: z.string().trim().min(3).max(200), sourceUrl: z.string().url().max(2000).optional(), credit: z.string().trim().max(200).optional() }).parse(request.body);
    const next = database.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM listing_images WHERE listing_id = ?").get(id) as { position: number };
    if (next.position >= 20) throw new ApiError(400, "image_limit_reached", "A listing can have at most 20 photos.");
    database.prepare("INSERT INTO listing_images(id, listing_id, url, alt_text, position, source_url, credit, license) VALUES (?, ?, ?, ?, ?, ?, ?, 'Owner supplied')").run(crypto.randomUUID(), id, input.url, input.altText, next.position, input.sourceUrl ?? null, input.credit ?? null);
    database.prepare("UPDATE listings SET updated_at=? WHERE id=?").run(new Date().toISOString(), id);
    response.status(201).json({ data: { position: next.position, ...input } });
  });
  router.post("/:id/publish", (request: AuthenticatedRequest, response) => { const id = String(request.params.id); const row = findOwned(database, request.user!.id, id); const image = database.prepare("SELECT 1 FROM listing_images WHERE listing_id = ?").get(id); if (!image) throw new ApiError(400, "photo_required", "Add at least one photo before publishing."); database.prepare("UPDATE listings SET status='published', published_at=?, updated_at=? WHERE id=?").run(new Date().toISOString(), new Date().toISOString(), String(row.id)); response.json({ data: mapOwnerListing(findOwned(database, request.user!.id, id)) }); });
  router.post("/:id/unpublish", (request: AuthenticatedRequest, response) => { const id = String(request.params.id); findOwned(database, request.user!.id, id); database.prepare("UPDATE listings SET status='unpublished', updated_at=? WHERE id=?").run(new Date().toISOString(), id); response.json({ data: mapOwnerListing(findOwned(database, request.user!.id, id)) }); });
  router.post("/:id/archive", (request: AuthenticatedRequest, response) => { const id = String(request.params.id); findOwned(database, request.user!.id, id); database.prepare("UPDATE listings SET status='archived', updated_at=? WHERE id=?").run(new Date().toISOString(), id); response.json({ data: mapOwnerListing(findOwned(database, request.user!.id, id)) }); });
  return router;
}

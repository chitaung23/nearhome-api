import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { ApiError } from "../lib/errors.js";

const searchSchema = z.object({
  purpose: z.enum(["sale", "rent"]).optional(),
  location: z.enum(["yangon", "mandalay", "bago"]).optional(),
  township: z.string().trim().min(1).max(80).optional(),
  propertyType: z.enum(["apartment", "condo", "house", "land", "commercial"]).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  minBedrooms: z.coerce.number().int().nonnegative().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

type ListingRow = Record<string, string | number | null>;

function mapListing(row: ListingRow) {
  return {
    id: row.id,
    purpose: row.purpose,
    title: row.title,
    description: row.description,
    propertyType: row.property_type,
    location: { code: row.location_code, label: row.location_label },
    township: row.township,
    priceMmk: row.price_mmk,
    rentPeriod: row.rent_period,
    area: { value: row.area_value, unit: row.area_unit },
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    isDemo: Boolean(row.is_demo),
    publishedAt: row.published_at,
    coverImage: row.image_url ? { url: row.image_url, alt: row.image_alt, credit: row.image_credit, sourceUrl: row.image_source_url } : null,
  };
}

export function createListingsRouter(database: Database): Router {
  const router = Router();
  router.get("/", (request, response) => {
    const query = searchSchema.parse(request.query);
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new ApiError(400, "invalid_price_range", "minPrice must be less than or equal to maxPrice.");
    }

    const where = ["l.status = 'published'"];
    const values: Array<string | number> = [];
    const add = (clause: string, value: string | number) => { where.push(clause); values.push(value); };
    if (query.purpose) add("l.purpose = ?", query.purpose);
    if (query.location) add("l.location_code = ?", query.location);
    if (query.township) add("LOWER(l.township) = LOWER(?)", query.township);
    if (query.propertyType) add("l.property_type = ?", query.propertyType);
    if (query.minPrice !== undefined) add("l.price_mmk >= ?", query.minPrice);
    if (query.maxPrice !== undefined) add("l.price_mmk <= ?", query.maxPrice);
    if (query.minBedrooms !== undefined) add("l.bedrooms >= ?", query.minBedrooms);
    if (query.q) {
      const term = `%${query.q}%`;
      where.push("(l.title LIKE ? OR l.description LIKE ? OR l.township LIKE ?)");
      values.push(term, term, term);
    }
    const orderBy = query.sort === "price_asc" ? "l.price_mmk ASC, l.id ASC" : query.sort === "price_desc" ? "l.price_mmk DESC, l.id ASC" : "l.published_at DESC, l.id ASC";
    const whereSql = where.join(" AND ");
    const count = database.prepare(`SELECT COUNT(*) AS total FROM listings l WHERE ${whereSql}`).get(...values) as { total: number };
    const offset = (query.page - 1) * query.limit;
    const rows = database.prepare(`SELECT l.*, loc.label AS location_label,
      image.url AS image_url, image.alt_text AS image_alt, image.credit AS image_credit, image.source_url AS image_source_url
      FROM listings l JOIN locations loc ON loc.code = l.location_code
      LEFT JOIN listing_images image ON image.listing_id = l.id AND image.position = 0
      WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...values, query.limit, offset) as ListingRow[];

    response.json({ data: rows.map(mapListing), meta: { page: query.page, pageSize: query.limit, total: count.total, totalPages: Math.ceil(count.total / query.limit) } });
  });

  router.get("/:id", (request, response) => {
    const row = database.prepare(`SELECT l.*, loc.label AS location_label,
      image.url AS image_url, image.alt_text AS image_alt, image.credit AS image_credit, image.source_url AS image_source_url
      FROM listings l JOIN locations loc ON loc.code = l.location_code
      LEFT JOIN listing_images image ON image.listing_id = l.id AND image.position = 0
      WHERE l.id = ? AND l.status = 'published'`).get(request.params.id) as ListingRow | undefined;
    if (!row) throw new ApiError(404, "listing_not_found", "The listing was not found.");
    response.json({ data: mapListing(row) });
  });
  return router;
}

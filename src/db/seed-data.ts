import type { Database } from "./database.js";
import { LOCATIONS } from "./locations.js";
import { hashPassword } from "../lib/auth.js";

const photos = [
  { id: "house", url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com/photos/178j8tJrNlc", credit: "Avi Werde on Unsplash" },
  { id: "modern", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com/photos/2gDwlIim3Uw", credit: "R ARCHITECTURE on Unsplash" },
  { id: "interior", url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com/photos/XkKCui44iM0", credit: "Hutomo Abrianto on Unsplash" },
  { id: "condo", url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com/photos/rOk4VSMS3Ck", credit: "R ARCHITECTURE on Unsplash" },
  { id: "apartment", url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com", credit: "Unsplash contributor; source page must be verified before production" },
  { id: "commercial", url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=82", source: "https://unsplash.com/photos/hh3ViD0r0Rc", credit: "Nastuh Abootalebi on Unsplash" },
] as const;

const propertyTypes = ["apartment", "condo", "house", "land", "commercial"] as const;

export function seedDemoData(database: Database): void {
  const insertLocation = database.prepare("INSERT OR REPLACE INTO locations(code, label, townships_json) VALUES (?, ?, ?)");
  for (const location of LOCATIONS) {
    insertLocation.run(location.code, location.label, JSON.stringify(location.townships));
  }

  const now = new Date("2026-09-01T08:00:00.000Z");
  const insertUser = database.prepare(`INSERT OR IGNORE INTO users
    (id, email, password_hash, display_name, role, show_email, show_phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)`);
  insertUser.run("demo-owner", "owner@demo.local", hashPassword("Owner123!"), "Demo Owner", "member", now.toISOString(), now.toISOString());
  insertUser.run("demo-member", "member@demo.local", hashPassword("Member123!"), "Demo Member", "member", now.toISOString(), now.toISOString());
  insertUser.run("demo-admin", "admin@demo.local", hashPassword("Admin123!"), "Demo Administrator", "admin", now.toISOString(), now.toISOString());
  database.prepare("UPDATE users SET email=?, password_hash=?, display_name=?, role='member', updated_at=? WHERE id='demo-owner'").run("owner@demo.local", hashPassword("Owner123!"), "Demo Owner", now.toISOString());

  const insertListing = database.prepare(`INSERT OR IGNORE INTO listings
    (id, owner_id, purpose, status, title, description, property_type, location_code, township, street_area,
     price_mmk, rent_period, area_value, area_unit, bedrooms, bathrooms, contact_preference, is_demo,
     created_at, updated_at, published_at)
    VALUES (?, 'demo-owner', ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', 1, ?, ?, ?)`);
  const insertImage = database.prepare(`INSERT OR IGNORE INTO listing_images
    (id, listing_id, url, alt_text, position, source_url, credit, license)
    VALUES (?, ?, ?, ?, 0, ?, ?, 'Unsplash License')`);

  for (let index = 0; index < 24; index += 1) {
    const location = LOCATIONS[index % LOCATIONS.length]!;
    const purpose = index % 2 === 0 ? "sale" : "rent";
    const propertyType = propertyTypes[index % propertyTypes.length]!;
    const township = location.townships[index % location.townships.length]!;
    const id = `demo-${String(index + 1).padStart(2, "0")}`;
    const publishedAt = new Date(now.getTime() - index * 86_400_000).toISOString();
    const price = purpose === "sale" ? 95_000_000 + index * 12_500_000 : 650_000 + index * 85_000;
    const photo = photos[index % photos.length]!;
    const typeLabel = propertyType[0]!.toUpperCase() + propertyType.slice(1);

    insertListing.run(
      id,
      purpose,
      `Sample ${typeLabel} in ${township}`,
      `Sample/demo listing for product testing. A bright ${propertyType} in ${township}, ${location.label}, with practical living space and convenient local access. This is not a real offer.`,
      propertyType,
      location.code,
      township,
      `${township} area`,
      price,
      purpose === "rent" ? "month" : null,
      720 + index * 45,
      "sqft",
      propertyType === "land" || propertyType === "commercial" ? null : 1 + (index % 4),
      propertyType === "land" ? null : 1 + (index % 3),
      publishedAt,
      publishedAt,
      publishedAt,
    );
    insertImage.run(`${id}-image-1`, id, photo.url, `Sample ${propertyType} in ${township}`, photo.source, photo.credit);
  }
}

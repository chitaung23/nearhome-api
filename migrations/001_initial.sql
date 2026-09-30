PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  phone TEXT,
  show_email INTEGER NOT NULL DEFAULT 0,
  show_phone INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  townships_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('sale', 'rent')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'unpublished', 'archived', 'hidden')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'condo', 'house', 'land', 'commercial')),
  location_code TEXT NOT NULL REFERENCES locations(code),
  township TEXT,
  street_area TEXT,
  price_mmk INTEGER NOT NULL CHECK (price_mmk > 0),
  rent_period TEXT CHECK (rent_period IS NULL OR rent_period = 'month'),
  area_value REAL NOT NULL CHECK (area_value > 0),
  area_unit TEXT NOT NULL CHECK (area_unit IN ('sqft', 'sqm')),
  bedrooms INTEGER CHECK (bedrooms IS NULL OR bedrooms >= 0),
  bathrooms INTEGER CHECK (bathrooms IS NULL OR bathrooms >= 0),
  contact_preference TEXT NOT NULL CHECK (contact_preference IN ('email', 'phone', 'both')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  source_url TEXT,
  credit TEXT,
  license TEXT,
  UNIQUE (listing_id, position)
);

CREATE INDEX IF NOT EXISTS idx_listings_public_newest
  ON listings(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_public_filters
  ON listings(status, purpose, location_code, property_type, price_mmk);
CREATE INDEX IF NOT EXISTS idx_listings_owner
  ON listings(owner_id, status, updated_at DESC);

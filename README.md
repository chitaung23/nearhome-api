# Property Portal API

Versioned HTTP API for the Myanmar Property Portal. The first implementation slice provides locations, public listing search, published listing detail, SQLite migrations, deterministic demo data, and an OpenAPI contract.

## Run locally

Requires Node.js 24+ (the API uses Node's built-in SQLite module).

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The API listens on `http://localhost:4000`; health is available at `/v1/health`.

## Commands

- `pnpm dev` — development server with reload
- `pnpm build` — TypeScript build
- `pnpm test` — API behavior tests
- `pnpm db:seed` — migrate and deterministically seed the configured database

Demo records are visibly marked and are disabled when `ENABLE_DEMO_SEED` is not `true`.

Development demo accounts:

- Owner: `owner@demo.local` / `Owner123!`
- Member: `member@demo.local` / `Member123!`
- Admin: `admin@demo.local` / `Admin123!`

Owners can create, edit, photo-attach, publish, unpublish, and archive their listings. Admins can review every listing and hide or restore content. Sessions use an HTTP-only cookie.

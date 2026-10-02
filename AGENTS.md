# API Engineering Guide

## Repository boundary

This repository owns the Property Portal HTTP API, authentication and authorization, business rules, persistence, database migrations, demo seeding, image metadata, and the OpenAPI contract.

The API is the only component allowed to read or write the application database. Web and mobile clients consume the versioned HTTP contract and must not become alternate sources of truth for validation, authorization, listing state transitions, or contact privacy.

User-visible API behavior belongs in `SPEC.md`. Setup and operating instructions belong in `README.md`.

## Chosen stack

- TypeScript using ECMAScript modules
- Node.js 24 or newer
- Express 5
- Node's built-in `node:sqlite` driver with SQLite
- Zod for request validation
- OpenAPI 3.1 in `openapi/openapi.yaml`
- pnpm for dependency and script management
- Node's built-in test runner

Do not replace these choices or introduce a second server framework, ORM, database, validation library, or package manager without an explicit architecture decision.

## Architecture

- `src/server.ts` is the process entry point and configuration boundary.
- `src/app.ts` composes middleware and mounts all routes beneath `/v1`.
- `src/routes/` owns transport parsing and resource handlers.
- `src/lib/` owns cross-cutting authentication and error behavior.
- `src/db/` owns database access, locations, and deterministic seed data.
- `migrations/` is the ordered, immutable database history. Add a new migration instead of editing an applied one.
- `openapi/openapi.yaml` is the public contract and must change with externally observable endpoint behavior.
- `test/` verifies authorization, validation, lifecycle, and public-query behavior through the application boundary.

Keep route code thin when business rules grow: extract reusable domain or data-access modules rather than sharing logic through one route handler. Keep SQL parameterized and keep multi-record state changes transactional.

## Invariants and constraints

- Public API paths remain versioned under `/v1` and use JSON with the established `{ data }` and `{ error }` envelopes.
- Public listing queries and details expose only `published` listings.
- Every mutation enforces authentication, ownership, or administrator access on the server.
- Browser sessions use secure HTTP-only cookies. Store only hashed session tokens and password hashes.
- Private contact and location data are never exposed unless the owner explicitly permits it.
- Prices are positive integer MMK values. Dates are stored in UTC.
- Supported listing purposes, statuses, property types, area units, and location codes remain constrained at both validation and persistence boundaries.
- SQLite foreign keys stay enabled. File-backed databases use WAL mode.
- Images live outside SQLite; the database stores ordered metadata and references. Uploads must be validated from their content before production upload support is enabled.
- Demo data is deterministic, visibly marked, rerunnable without duplicates, and disabled in production by default.
- CORS remains explicit and credential-aware; do not use a wildcard origin with cookies.
- Never put credentials, production data, database files, or uploaded media in Git.

## Change discipline

When an API behavior changes, update its validation, OpenAPI definition, tests, and `SPEC.md` in the same change. Run `pnpm test` and `pnpm build` before considering an implementation change complete.

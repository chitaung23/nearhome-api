import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Database } from "./db/database.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { createListingsRouter } from "./routes/listings.js";
import { createLocationsRouter } from "./routes/locations.js";
import { createAuthRouter } from "./routes/auth.js";
import { createOwnerListingsRouter } from "./routes/owner-listings.js";
import { createAdminRouter } from "./routes/admin.js";

export function createApp(database: Database, webOrigin: string): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.get("/v1/health", (_request, response) => response.json({ data: { status: "ok" } }));
  app.use("/v1/auth", createAuthRouter(database));
  app.use("/v1/locations", createLocationsRouter(database));
  app.use("/v1/listings", createListingsRouter(database));
  app.use("/v1/me/listings", createOwnerListingsRouter(database));
  app.use("/v1/admin", createAdminRouter(database));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

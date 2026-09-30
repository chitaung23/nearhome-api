import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { openDatabase, type Database } from "../src/db/database.js";
import { seedDemoData } from "../src/db/seed-data.js";

let database: Database;
let server: Server;
let baseUrl: string;

before(() => {
  database = openDatabase(":memory:");
  seedDemoData(database);
  server = createApp(database, "http://localhost:5173").listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server.close();
  database.close();
});

test("returns supported locations", async () => {
  const response = await fetch(`${baseUrl}/v1/locations`);
  const body = await response.json() as { data: Array<{ code: string }> };
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.map((location) => location.code).sort(), ["bago", "mandalay", "yangon"]);
});

test("filters published listings and paginates deterministically", async () => {
  const response = await fetch(`${baseUrl}/v1/listings?purpose=sale&location=yangon&limit=3`);
  const body = await response.json() as { data: Array<{ purpose: string; location: { code: string }; isDemo: boolean }>; meta: { pageSize: number; total: number } };
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 3);
  assert.ok(body.meta.total >= 3);
  assert.equal(body.meta.pageSize, 3);
  assert.ok(body.data.every((listing) => listing.purpose === "sale" && listing.location.code === "yangon" && listing.isDemo));
});

test("never exposes nonpublic listings", async () => {
  database.prepare("UPDATE listings SET status = 'draft' WHERE id = 'demo-01'").run();
  const response = await fetch(`${baseUrl}/v1/listings/demo-01`);
  assert.equal(response.status, 404);
  const search = await fetch(`${baseUrl}/v1/listings?q=Sample`);
  const body = await search.json() as { data: Array<{ id: string }> };
  assert.ok(!body.data.some((listing) => listing.id === "demo-01"));
});

test("rejects an inverted price range", async () => {
  const response = await fetch(`${baseUrl}/v1/listings?minPrice=200&maxPrice=100`);
  const body = await response.json() as { error: { code: string } };
  assert.equal(response.status, 400);
  assert.equal(body.error.code, "invalid_price_range");
});

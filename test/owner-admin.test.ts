import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { openDatabase, type Database } from "../src/db/database.js";
import { seedDemoData } from "../src/db/seed-data.js";

let database: Database; let server: Server; let baseUrl: string;
before(() => { database = openDatabase(":memory:"); seedDemoData(database); server = createApp(database, "http://localhost:5173").listen(0); baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; });
after(() => { server.close(); database.close(); });

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0]!;
}

test("owner can create a draft, add a photo, and publish it", async () => {
  const cookie = await login("owner@demo.local", "Owner123!");
  const draft = await fetch(`${baseUrl}/v1/me/listings`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ purpose: "sale", title: "A new owner listing", description: "A detailed owner submitted property description for testing.", propertyType: "house", locationCode: "yangon", township: "Bahan", priceMmk: 125000000, areaValue: 1400, areaUnit: "sqft", bedrooms: 3, bathrooms: 2, contactPreference: "email" }) });
  const draftBody = await draft.json() as { data: { id: string; status: string } }; assert.equal(draft.status, 201); assert.equal(draftBody.data.status, "draft");
  const image = await fetch(`${baseUrl}/v1/me/listings/${draftBody.data.id}/images`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ url: "https://example.com/house.jpg", altText: "Front of the house" }) }); assert.equal(image.status, 201);
  const published = await fetch(`${baseUrl}/v1/me/listings/${draftBody.data.id}/publish`, { method: "POST", headers: { cookie } }); const publishedBody = await published.json() as { data: { status: string } }; assert.equal(published.status, 200); assert.equal(publishedBody.data.status, "published");
});

test("ownership and admin boundaries are enforced", async () => {
  const ownerCookie = await login("owner@demo.local", "Owner123!"); const memberCookie = await login("member@demo.local", "Member123!"); const adminCookie = await login("admin@demo.local", "Admin123!");
  const forbidden = await fetch(`${baseUrl}/v1/me/listings/demo-01`, { headers: { cookie: memberCookie } }); assert.equal(forbidden.status, 404);
  const hidden = await fetch(`${baseUrl}/v1/admin/listings/demo-01/status`, { method: "PATCH", headers: { cookie: adminCookie, "content-type": "application/json" }, body: JSON.stringify({ status: "hidden" }) }); assert.equal(hidden.status, 200);
  const publicDetail = await fetch(`${baseUrl}/v1/listings/demo-01`); assert.equal(publicDetail.status, 404);
  const memberAdmin = await fetch(`${baseUrl}/v1/admin/listings`, { headers: { cookie: memberCookie } }); assert.equal(memberAdmin.status, 403);
  const ownerMe = await fetch(`${baseUrl}/v1/auth/me`, { headers: { cookie: ownerCookie } }); assert.equal(ownerMe.status, 200);
});

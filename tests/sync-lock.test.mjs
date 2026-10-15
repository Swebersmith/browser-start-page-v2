import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Use the same local Workers runtime that the project's Wrangler ships with.
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve("wrangler/package.json"))("miniflare");
const runtimeOptions = options => convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options;
const password = "test-only-creation-password";
const payload = { shortcuts: [], widgets: [], siteName: "测试首页" };
let worker;
let unconfigured;
let database;

before(async () => {
  const options = {
    modules: true,
    scriptPath: fileURLToPath(new URL("../src/worker.js", import.meta.url)),
    compatibilityDate: "2026-06-30",
    d1Databases: ["DB"],
  };
  worker = new Miniflare(runtimeOptions({ ...options, bindings: { SYNC_CREATE_PASSWORD: password } }));
  unconfigured = new Miniflare(runtimeOptions(options));
  database = await worker.getD1Database("DB");
  await worker.dispatchFetch("https://sync.test/api/sync/initialize");
});

after(async () => {
  await Promise.all([worker?.dispose(), unconfigured?.dispose()]);
});

function request(runtime, key, method = "PUT", creationPassword, data = payload) {
  const headers = { "content-type": "application/json" };
  if (creationPassword !== undefined) headers["X-Sync-Create-Password"] = creationPassword;
  return runtime.dispatchFetch(`https://sync.test/api/sync/${key}`, {
    method, headers, ...(method === "GET" ? {} : { body: JSON.stringify(data) }),
  });
}

for (const method of ["PUT", "POST"]) {
  test(`${method}: creating a code requires the correct password`, async () => {
    const key = `new-${method}`;
    for (const supplied of [undefined, "wrong-password", "x".repeat(129)]) {
      const denied = await request(worker, key, method, supplied);
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get("cache-control"), "no-store");
      assert.equal((await (await request(worker, key, "GET")).json()).exists, false);
    }
    const created = await request(worker, key, method, password);
    assert.equal(created.status, 200);
    assert.equal((await created.json()).created, true);
    const read = await (await request(worker, key, "GET")).json();
    assert.equal(read.exists, true);
    assert.equal(read.payload.siteName, payload.siteName);
    assert.equal(JSON.stringify(read).includes(password), false);
  });

  test(`${method}: existing codes update without the creation password`, async () => {
    const key = `existing-${method}`;
    await request(worker, key, "PUT", password);
    const updated = await request(worker, key, method, undefined, { ...payload, siteName: "已更新" });
    assert.equal(updated.status, 200);
    assert.equal((await (await request(worker, key, "GET")).json()).payload.siteName, "已更新");
  });
}

test("missing server secret blocks creation but preserves existing sync", async () => {
  const denied = await request(unconfigured, "unconfigured-code");
  assert.equal(denied.status, 503);
  assert.equal((await denied.json()).error, "SYNC_CREATION_NOT_CONFIGURED");
  const db = await unconfigured.getD1Database("DB");
  await db.prepare("INSERT INTO sync_profiles (sync_key, payload) VALUES (?, ?)")
    .bind("existing-code", JSON.stringify(payload)).run();
  assert.equal((await request(unconfigured, "existing-code")).status, 200);
  assert.equal((await (await request(unconfigured, "existing-code", "GET")).json()).exists, true);
});

test("deletion during an existing-code update cannot recreate a code", async () => {
  await request(worker, "deleted-code", "PUT", password);
  await database.prepare(`CREATE TRIGGER delete_before_update BEFORE UPDATE ON sync_profiles
    WHEN OLD.sync_key = 'deleted-code' BEGIN
      DELETE FROM sync_profiles WHERE sync_key = OLD.sync_key;
      SELECT RAISE(IGNORE);
    END`).run();
  const response = await request(worker, "deleted-code", "POST");
  assert.equal(response.status, 409);
  assert.equal((await (await request(worker, "deleted-code", "GET")).json()).exists, false);
});

test("a simultaneous creator cannot overwrite an already-created profile", async () => {
  await database.prepare(`CREATE TRIGGER insert_competing_profile BEFORE INSERT ON sync_profiles
    WHEN NEW.sync_key = 'racing-code' BEGIN
      INSERT INTO sync_profiles (sync_key, payload) VALUES ('racing-code', '{"shortcuts":[],"widgets":[],"siteName":"first creator"}');
    END`).run();
  const response = await request(worker, "racing-code", "PUT", password);
  assert.equal(response.status, 409);
  assert.equal((await (await request(worker, "racing-code", "GET")).json()).payload.siteName, "first creator");
});

test("invalid payloads and unsupported methods never create records", async () => {
  assert.equal((await request(worker, "invalid-code", "PUT", password, {})).status, 400);
  assert.equal((await request(worker, "invalid-code", "DELETE", password)).status, 405);
  assert.equal((await (await request(worker, "invalid-code", "GET")).json()).exists, false);
});

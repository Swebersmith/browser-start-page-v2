import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { handleHistory, handleHistoryDetail, handleWeather, handleCities } from "../src/content.js";
import worker from "../src/worker.js";
const realFetch = globalThis.fetch;
const db = new DatabaseSync(":memory:");
const DB = { prepare(sql) { let args = []; return { bind(...values) { args = values; return this; }, async run() { db.prepare(sql).run(...args); return { success: true }; }, async first() { return db.prepare(sql).get(...args) || null; } }; } };
afterEach(() => { globalThis.fetch = realFetch; });
const event = { year: "1964", title: "中国首次原子弹试验成功", desc: "中国于1964年10月16日首次原子弹试验成功。", link: "https://baike.baidu.com/item/原子弹" };
const response = data => Response.json(data);

test("history races sources and preserves complete summaries and source links", async () => {
  globalThis.fetch = async url => String(url).includes("baike.baidu.com") ? response({ "10": { "1016": [event, { year: "1945", title: "联合国粮农组织成立", desc: "国际粮农合作。" }] } }) : Promise.reject(new Error("Provider blocked"));
  const result = await handleHistory(new Request("https://test/api/today-history?date=2026-10-16"), { DB });
  const data = await result.json();
  assert.equal(result.status, 200); assert.equal(data.date, "2026-10-16"); assert.equal(data.domestic[0].url, new URL(event.link).href);
  assert.equal(data.world.length, 1);
});

test("history survives all upstream failures using the same calendar-day D1 cache", async () => {
  const old = { date: "2025-10-16", domestic: [event], world: [], fetchedAt: "2025-10-16T00:00:00Z", source: "百度百科" };
  db.prepare("INSERT OR REPLACE INTO history_cache VALUES (?, ?, ?)").run("10-16", JSON.stringify(old), old.fetchedAt);
  globalThis.fetch = async () => { throw new Error("Network down"); };
  const data = await (await handleHistory(new Request("https://test/api/today-history?date=2026-10-16"), { DB })).json();
  assert.equal(data.stale, true); assert.equal(data.date, "2026-10-16"); assert.equal(data.domestic.length, 1);
  const missing = await handleHistory(new Request("https://test/api/today-history?date=2026-10-17"), { DB });
  assert.equal(missing.status, 503);
  assert.deepEqual((await missing.json()).domestic, []);
});

test("a working backup is used when the direct history source fails", async () => {
  globalThis.fetch = async url => String(url).includes("60s.viki.moe") ? response({ data: { month: 10, day: 18, items: [event] } }) : Promise.reject(new Error("blocked"));
  const result = await handleHistory(new Request("https://test/api/today-history?date=2026-10-18"), {});
  assert.equal(result.status, 200);
});

test("a stalled history provider does not block the backup and is cancelled", async () => {
  let cancelled = false;
  globalThis.fetch = async (url, options) => String(url).includes("60s.viki.moe")
    ? response({ data: { month: 10, day: 20, items: [event] } })
    : new Promise((resolve, reject) => options.signal.addEventListener("abort", () => { cancelled = true; reject(new Error("cancelled")); }, { once: true }));
  assert.equal((await handleHistory(new Request("https://test/api/today-history?date=2026-10-20"), {})).status, 200);
  assert.equal(cancelled, true);
});

test("invalid dates and mismatched upstream dates never show unrelated events", async () => {
  for (const date of ["2026-02-30", "2026-99-99", "bad"]) assert.equal((await handleHistory(new Request(`https://test/api/today-history?date=${date}`), {})).status, 400);
  globalThis.fetch = async url => String(url).includes("60s.viki.moe") ? response({ data: { month: 9, day: 9, items: [event] } }) : response({});
  assert.equal((await handleHistory(new Request("https://test/api/today-history?date=2026-10-19"), {})).status, 503);
});

test("weather validates coordinates and returns seven daily and 24 hourly entries", async () => {
  globalThis.fetch = async url => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("forecast_days"), "7"); assert.equal(query.get("wind_speed_unit"), "ms");
    return response({ current: { temperature_2m: 20, time: "2026-10-16T12:15" }, daily: { time: Array(7).fill("2026-10-16") }, hourly: { time: Array.from({ length: 48 }, (_, i) => `2026-10-${16 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`), temperature_2m: Array(48).fill(20) } });
  };
  for (const query of ["", "latitude=91&longitude=1", "latitude=1&longitude=NaN"]) assert.equal((await handleWeather(new Request(`https://test/api/weather?${query}`))).status, 400);
  const data = await (await handleWeather(new Request("https://test/api/weather?latitude=39.9&longitude=116.4"))).json();
  assert.equal(data.daily.time.length, 7); assert.equal(data.hourly.time.length, 24); assert.equal(data.hourly.time[0], "2026-10-16T13:00");
});

test("detail requests cannot proxy arbitrary URLs and sanitize source HTML", async () => {
  assert.equal((await handleHistoryDetail(new Request("https://test/api/history-detail?url=http://127.0.0.1"))).status, 400);
  globalThis.fetch = async url => { assert.equal(new URL(url).hostname, "baike.baidu.com"); return response({ title: "示例", abstract: "<b>较详细的介绍</b>" }); };
  const data = await (await handleHistoryDetail(new Request("https://test/api/history-detail?url=https://baike.baidu.com/item/示例"))).json();
  assert.equal(data.detail, "较详细的介绍");
});

test("weather retries a transient failure before giving up", async () => {
  let calls = 0;
  globalThis.fetch = async () => { if (++calls === 1) throw new Error("temporary failure"); return response({ current: { temperature_2m: 20 }, daily: { time: ["2026-10-16"] } }); };
  assert.equal((await handleWeather(new Request("https://test/api/weather?latitude=0&longitude=0"))).status, 200);
  assert.equal(calls, 2);
});

test("city search is bounded and provider failures return a useful status", async () => {
  assert.equal((await handleCities(new Request("https://test/api/weather/cities?q=a"))).status, 400);
  globalThis.fetch = async () => { throw new Error("unavailable"); };
  assert.equal((await handleCities(new Request("https://test/api/weather/cities?q=北京"))).status, 502);
});

test("website enrichment blocks private destinations and private redirects", async () => {
  for (const url of ["http://127.0.0.1", "http://192.168.1.2", "https://user:password@example.com"]) {
    assert.equal((await worker.fetch(new Request(`https://test/api/metadata?url=${encodeURIComponent(url)}`), {})).status, 400);
  }
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }); };
  assert.equal((await worker.fetch(new Request("https://test/api/metadata?url=https://example.com"), {})).status, 502);
  assert.equal(calls, 1);
});

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const reply = (data, status = 200, maxAge = 0) => new Response(JSON.stringify(data), {
  status, headers: { ...JSON_HEADERS, "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store" },
});

export function cleanText(value, limit = 3000) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, limit);
}

async function fetchJson(url, { timeout = 5000, limit = 1_500_000, signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok || !response.body) throw new Error("Upstream unavailable");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "", bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) throw new Error("Upstream response too large");
        text += decoder.decode(value, { stream: true });
      }
      return JSON.parse(text + decoder.decode());
    } finally { await reader.cancel().catch(() => {}); }
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

export function dateParts(value) {
  const date = value || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) return null;
  return { date, month: date.slice(5, 7), day: date.slice(8, 10), key: date.slice(5) };
}

function sourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "baike.baidu.com" || /^(zh|en)\.wikipedia\.org$/.test(url.hostname)) ? url.href : "";
  } catch { return ""; }
}

export function normalizeEvent(item) {
  const title = cleanText(item.title || item.event, 160);
  if (!title || !String(item.year || "").match(/^-?\d{1,4}$/)) return null;
  return { year: String(item.year), title, detail: cleanText(item.description || item.desc || item.detail || title), url: sourceUrl(item.link || item.url), source: "百度百科" };
}

function groupEvents(items) {
  const seen = new Set();
  const events = items.map(normalizeEvent).filter(item => {
    if (!item) return false;
    const key = `${item.year}|${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 36);
  if (!events.length) throw new Error("No events for requested date");
  const domestic = [], world = [];
  events.forEach(item => (/中国|中华|我国|清朝|民国|北京|上海|南京|香港|澳门|台湾|共产党|抗日|解放军|唐朝|宋朝|元朝|明朝|清廷|北洋|国民政府|毛泽东|周恩来|邓小平|神舟|嫦娥|新中国/.test(`${item.title} ${item.detail}`) ? domestic : world).push(item));
  return { domestic, world };
}

async function historyCache(db, key, payload) {
  if (!db) return null;
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS history_cache (date_key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at TEXT NOT NULL)").run();
    const today = dateParts().date;
    const cleanup = db.prepare("DELETE FROM history_cache WHERE date_key <> 'today' OR json_extract(payload, '$.date') IS NOT ?").bind(today);
    // A single slot replaces the old per-anniversary records. Other requested
    // dates remain readable from upstream, but are never retained in D1.
    if (key !== today || (payload && payload.date !== today)) {
      await cleanup.run();
      return null;
    }
    if (payload) {
      await db.batch([cleanup, db.prepare("INSERT INTO history_cache (date_key, payload, fetched_at) VALUES ('today', ?, ?) ON CONFLICT(date_key) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at")
        .bind(JSON.stringify(payload), payload.fetchedAt)]);
      return payload;
    }
    const results = await db.batch([cleanup, db.prepare("SELECT payload FROM history_cache WHERE date_key = 'today'")]);
    const row = results[1].results[0];
    return row ? JSON.parse(row.payload) : null;
  } catch { return null; }
}

export async function handleHistory(request, env) {
  if (request.method !== "GET") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  let date;
  try { date = dateParts(new URL(request.url).searchParams.get("date")); } catch { /* Invalid calendar date. */ }
  if (!date) return reply({ error: "INVALID_DATE" }, 400);
  const cached = await historyCache(env.DB, date.date);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 24 * 3600_000) return reply({ ...cached, date: date.date, cached: true });
  const controller = new AbortController();
  try {
    const result = await Promise.any([
      fetchJson(`https://baike.baidu.com/cms/home/eventsOnHistory/${date.month}.json`, { signal: controller.signal })
        .then(data => groupEvents(data[date.month]?.[date.month + date.day] || [])),
      fetchJson(`https://60s.viki.moe/v2/today-in-history?date=${date.date}`, { signal: controller.signal })
        .then(data => {
          if (Number(data.data?.month) !== Number(date.month) || Number(data.data?.day) !== Number(date.day)) throw new Error("Wrong upstream date");
          return groupEvents(data.data?.items || []);
        }),
    ]);
    const payload = { ...result, date: date.date, source: "百度百科 · 60s API", fetchedAt: new Date().toISOString(), stale: false };
    await historyCache(env.DB, date.date, payload);
    return reply(payload);
  } catch {
    if (cached) return reply({ ...cached, date: date.date, cached: true, stale: true });
    return reply({ date: date.date, domestic: [], world: [], unavailable: true, source: "资料暂时不可用" }, 503);
  } finally { controller.abort(); }
}

export async function handleHistoryDetail(request) {
  if (request.method !== "GET") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const input = new URL(request.url).searchParams;
  const link = sourceUrl(input.get("url"));
  if (!link || new URL(link).hostname !== "baike.baidu.com") return reply({ error: "INVALID_SOURCE" }, 400);
  let word;
  try { word = decodeURIComponent(new URL(link).pathname.split("/")[2] || "").slice(0, 100); } catch { return reply({ error: "INVALID_SOURCE" }, 400); }
  if (!word) return reply({ error: "INVALID_SOURCE" }, 400);
  try {
    const data = await fetchJson(`https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?appid=379020&bk_key=${encodeURIComponent(word)}`);
    const detail = cleanText(data.abstract, 6000);
    if (!detail) throw new Error("No article abstract");
    return reply({ title: cleanText(data.title, 160), detail, url: link, source: "百度百科" });
  } catch { return reply({ error: "DETAIL_UNAVAILABLE" }, 502); }
}

function coordinate(value, limit) {
  if (value === null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export async function handleWeather(request) {
  if (request.method !== "GET") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const params = new URL(request.url).searchParams;
  const latitude = coordinate(params.get("latitude"), 90), longitude = coordinate(params.get("longitude"), 180);
  if (latitude === null || longitude === null) return reply({ error: "INVALID_COORDINATES" }, 400);
  const query = new URLSearchParams({
    latitude: latitude.toFixed(2), longitude: longitude.toFixed(2), timezone: "auto", forecast_days: "7", wind_speed_unit: "ms",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,cloud_cover,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,wind_speed_10m_max",
    hourly: "temperature_2m,weather_code,precipitation_probability",
  });
  try {
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${query}`, { timeout: 4000, limit: 150_000 });
        if (!Number.isFinite(data.current?.temperature_2m) || !data.daily?.time?.length) throw new Error("Invalid forecast");
        break;
      } catch (error) { if (attempt === 1) throw error; }
    }
    const start = Math.max(0, data.hourly?.time?.findIndex(time => time >= data.current.time) || 0);
    if (data.hourly) Object.keys(data.hourly).forEach(key => { data.hourly[key] = data.hourly[key].slice(start, start + 24); });
    return reply({ ...data, source: "Open-Meteo", fetchedAt: new Date().toISOString() }, 200, 600);
  } catch { return reply({ error: "WEATHER_UNAVAILABLE" }, 502); }
}

export async function handleCities(request) {
  if (request.method !== "GET") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2 || query.length > 60) return reply({ error: "INVALID_CITY" }, 400);
  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "6", language: "zh", format: "json" })}`);
    return reply({ results: (data.results || []).map(item => ({ name: item.name, region: item.admin1 || "", country: item.country || "", latitude: item.latitude, longitude: item.longitude })) }, 200, 3600);
  } catch { return reply({ error: "CITY_SEARCH_UNAVAILABLE" }, 502); }
}

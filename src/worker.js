const MAX_PAYLOAD_BYTES = 250_000;
const MAX_METADATA_BYTES = 96_000;

const fallbackHistoryEvents = {
  "01-01": {
    domestic: [{ year: "1912", title: "中华民国临时政府在南京成立", detail: "孙中山在南京就任临时大总统，中华民国临时政府成立。" }],
    world: [{ year: "1804", title: "海地宣布独立", detail: "海地成为拉丁美洲和加勒比地区首个独立共和国。" }],
  },
  "02-12": {
    domestic: [{ year: "1912", title: "清帝退位，清朝统治结束", detail: "溥仪颁布退位诏书，中国两千多年君主专制制度走向终结。" }],
    world: [{ year: "1809", title: "亚伯拉罕·林肯出生", detail: "林肯后来成为美国第十六任总统。" }],
  },
  "05-04": {
    domestic: [{ year: "1919", title: "五四运动爆发", detail: "北京学生举行示威，推动了反帝反封建爱国运动。" }],
    world: [{ year: "1979", title: "撒切尔夫人出任英国首相", detail: "她成为英国首位女性首相。" }],
  },
  "07-01": {
    domestic: [{ year: "1921", title: "中国共产党成立纪念日", detail: "中国共产党第一次全国代表大会召开于 1921 年，7 月 1 日后来被定为建党纪念日。" }],
    world: [{ year: "1867", title: "加拿大联邦成立", detail: "加拿大自治领在这一天成立。" }],
  },
  "10-01": {
    domestic: [{ year: "1949", title: "中华人民共和国中央人民政府成立", detail: "开国大典在北京天安门广场举行。" }],
    world: [{ year: "1960", title: "尼日利亚宣布独立", detail: "尼日利亚结束英国殖民统治，成为独立国家。" }],
  },
  "12-13": {
    domestic: [{ year: "2014", title: "中国设立南京大屠杀死难者国家公祭日", detail: "中国首次举行南京大屠杀死难者国家公祭仪式。" }],
    world: [{ year: "1937", title: "南京大屠杀发生", detail: "这段历史提醒人们珍视和平与生命。" }],
  },
};

const schemaSql =
  "CREATE TABLE IF NOT EXISTS sync_profiles (sync_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function getSyncKey(pathname) {
  const match = pathname.match(/^\/api\/sync\/([^/]+)$/);
  if (!match) return "";
  return decodeURIComponent(match[1]).trim().slice(0, 80);
}

function isMetadataPath(pathname) {
  return pathname === "/api/metadata";
}

function isTodayHistoryPath(pathname) {
  return pathname === "/api/today-history";
}

function isValidPayload(payload) {
  return (
    payload &&
    Array.isArray(payload.shortcuts) &&
    Array.isArray(payload.widgets) &&
    (!payload.searchHistory || Array.isArray(payload.searchHistory)) &&
    JSON.stringify(payload).length <= MAX_PAYLOAD_BYTES
  );
}

async function ensureSchema(db) {
  await db.prepare(schemaSql).run();
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i")) || tag.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return match ? decodeHtml(match[1].trim()) : "";
}

function resolveMetadataUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

async function readLimitedText(response, limit = MAX_METADATA_BYTES) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  while (size < limit) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = value.slice(0, Math.max(0, limit - size));
    size += chunk.byteLength;
    text += decoder.decode(chunk, { stream: size < limit });
    if (size >= limit) break;
  }

  await reader.cancel().catch(() => undefined);
  text += decoder.decode();
  return text;
}

function parseMetadata(html, pageUrl) {
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i) ||
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]*>/i);
  const title =
    getAttr(titleMatch?.[0] || "", "content") ||
    decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "");
  const themeTag = html.match(/<meta[^>]+name=["']theme-color["'][^>]*>/i);
  const themeColor = getAttr(themeTag?.[0] || "", "content");
  const iconTags = [...html.matchAll(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon|shortcut icon|mask-icon)[^"']*["'][^>]*>/gi)];
  const icon = iconTags.map((match) => resolveMetadataUrl(getAttr(match[0], "href"), pageUrl)).find(Boolean);
  const page = new URL(pageUrl);

  return {
    title: title.slice(0, 80),
    color: /^#[0-9a-f]{6}$/i.test(themeColor) ? themeColor : "",
    icon: icon || `${page.origin}/favicon.ico`,
  };
}

async function handleMetadata(request) {
  if (request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url") || "";
  let pageUrl;

  try {
    pageUrl = new URL(rawUrl);
  } catch {
    return json({ error: "INVALID_URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(pageUrl.protocol)) {
    return json({ error: "INVALID_URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(pageUrl.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return json({ error: "FETCH_FAILED" }, { status: 502 });
    }

    const html = await readLimitedText(response);
    return json(parseMetadata(html, response.url || pageUrl.toString()));
  } catch (error) {
    return json({ error: error.name === "AbortError" ? "FETCH_TIMEOUT" : "FETCH_FAILED" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

function getTodayKeys(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return [
    `${month}/${day}`,
    `${month}-${day}`,
    `${month}${day}`,
    `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  ];
}

function getTodayFallback(date = new Date()) {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (
    fallbackHistoryEvents[key] || {
      domestic: [{ year: "国内", title: "国内历史资料等待在线源更新", detail: "请稍后刷新，系统会继续从国内可访问的数据源获取当天事件。" }],
      world: [{ year: "国际", title: "国际历史资料等待在线源更新", detail: "请稍后刷新，系统会继续从国内可访问的数据源获取当天事件。" }],
    }
  );
}

function normalizeHistoryEvent(event) {
  if (!event || typeof event !== "object") return null;
  const title = event.title || event.event || event.desc || event.content || event.name || event.info;
  const detail = event.description || event.detail || event.desc || event.content || title;
  const year = event.year || event.date || event.time || "";
  if (!title) return null;

  return {
    year: String(year).replace(/[^\d-]/g, "").slice(0, 8) || "今天",
    title: String(title).replace(/\s+/g, " ").trim().slice(0, 80),
    detail: String(detail).replace(/\s+/g, " ").trim().slice(0, 180),
  };
}

function collectHistoryEvents(value, items = [], seen = new Set(), depth = 0) {
  if (!value || depth > 5 || items.length >= 16) return items;

  if (Array.isArray(value)) {
    value.forEach((item) => collectHistoryEvents(item, items, seen, depth + 1));
    return items;
  }

  if (typeof value === "string") {
    const match = value.match(/(?:公元)?(\d{3,4})年?\s*[-：:，,]?\s*(.+)/);
    if (match) {
      const event = { year: match[1], title: match[2].trim().slice(0, 80), detail: value.trim().slice(0, 180) };
      const key = `${event.year}|${event.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(event);
      }
    }
    return items;
  }

  if (typeof value !== "object") return items;

  const direct = normalizeHistoryEvent(value);
  if (direct) {
    const key = `${direct.year}|${direct.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(direct);
    }
  }

  for (const key of ["data", "result", "list", "events", "content", "news", "items"]) {
    if (value[key]) collectHistoryEvents(value[key], items, seen, depth + 1);
  }

  return items;
}

function isDomesticHistoryEvent(event) {
  return /中国|中华|我国|清朝|民国|北京|上海|南京|香港|澳门|台湾|长城|故宫|共产党|抗日|解放军|唐朝|宋朝|元朝|明朝|清廷|北洋|国民政府/.test(
    `${event.title} ${event.detail}`,
  );
}

function mergeHistoryGroups(events, fallback) {
  const domestic = events.filter(isDomesticHistoryEvent).slice(0, 2);
  const world = events.filter((event) => !isDomesticHistoryEvent(event)).slice(0, 2);

  return {
    domestic: domestic.length ? domestic : fallback.domestic,
    world: world.length ? world : fallback.world,
  };
}

async function handleTodayHistory(request) {
  if (request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const fallback = getTodayFallback(now);
  const historyApis = [
    "https://60s.viki.moe/v2/today-in-history",
    "https://api.oioweb.cn/api/common/history",
    "https://api.vvhan.com/api/lishi?type=json",
    `https://api.52vmy.cn/api/wl/lishi?month=${month}&day=${day}&format=json`,
  ];

  for (const apiUrl of historyApis) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(apiUrl, {
        headers: { accept: "application/json,text/plain,*/*" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("history fetch failed");

      const text = await readLimitedText(response, 80_000);
      const data = JSON.parse(text);
      const events = collectHistoryEvents(data);
      if (events.length) {
        return json({ ...mergeHistoryGroups(events, fallback), source: "domestic_api" });
      }
    } catch {
      // Try the next domestic source, then fall back locally.
    } finally {
      clearTimeout(timeout);
    }
  }

  return json({ ...fallback, source: "fallback" });
}

async function handleSync(request, env, syncKey) {
  if (!env.DB) {
    return json(
      {
        error: "D1_NOT_CONFIGURED",
        message: "Cloudflare D1 binding DB is not configured.",
      },
      { status: 503 },
    );
  }

  if (!syncKey || syncKey.length < 4) {
    return json({ error: "INVALID_SYNC_KEY" }, { status: 400 });
  }

  await ensureSchema(env.DB);

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT payload, updated_at FROM sync_profiles WHERE sync_key = ?",
    )
      .bind(syncKey)
      .first();

    if (!row) return json({ exists: false, payload: null, updatedAt: null });

    return json({
      exists: true,
      payload: JSON.parse(row.payload),
      updatedAt: row.updated_at,
    });
  }

  if (request.method === "POST" || request.method === "PUT") {
    const payload = await request.json().catch(() => null);
    if (!isValidPayload(payload)) {
      return json({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const text = JSON.stringify({
      shortcuts: payload.shortcuts,
      widgets: payload.widgets,
      searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.slice(0, 8) : [],
    });

    const result = await env.DB.prepare(
      `
      INSERT INTO sync_profiles (sync_key, payload, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(sync_key) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
      `,
    )
      .bind(syncKey, text)
      .run();

    return json({ ok: true, updated: result.success });
  }

  return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const syncKey = getSyncKey(url.pathname);

      if (isMetadataPath(url.pathname)) {
        return await handleMetadata(request);
      }

      if (isTodayHistoryPath(url.pathname)) {
        return await handleTodayHistory(request);
      }

      if (syncKey) {
        return await handleSync(request, env, syncKey);
      }

      return await env.ASSETS.fetch(request);
    } catch (error) {
      return json(
        {
          error: "WORKER_EXCEPTION",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  },
};

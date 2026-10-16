import { handleHistory, handleHistoryDetail, handleWeather, handleCities } from "./content.js";

const MAX_PAYLOAD_BYTES = 250_000;
const MAX_METADATA_BYTES = 96_000;

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

function isAiPath(pathname) {
  return pathname === "/api/ai";
}

function isValidPayload(payload) {
  return (
    payload &&
    Array.isArray(payload.shortcuts) &&
    Array.isArray(payload.widgets) &&
    (!payload.searchHistory || Array.isArray(payload.searchHistory)) &&
    (!payload.engines || Array.isArray(payload.engines)) &&
    (!payload.siteName || typeof payload.siteName === "string") &&
    (!payload.defaultCategory || typeof payload.defaultCategory === "string") &&
    (!payload.searchTarget || typeof payload.searchTarget === "string") &&
    JSON.stringify(payload).length <= MAX_PAYLOAD_BYTES
  );
}

/*
 * 同步载荷要透传的附加设置。
 * 之前这里只写回 shortcuts / widgets / searchHistory，导致站名等字段
 * 前端发了但永远存不进 D1。
 */
function buildSyncPayload(payload) {
  return {
    shortcuts: payload.shortcuts,
    widgets: payload.widgets,
    searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.slice(0, 8) : [],
    siteName: typeof payload.siteName === "string" ? payload.siteName.slice(0, 30) : "",
    defaultCategory: typeof payload.defaultCategory === "string" ? payload.defaultCategory.slice(0, 16) : "",
    searchTarget: payload.searchTarget === "_blank" ? "_blank" : "_self",
    engines: Array.isArray(payload.engines)
      ? payload.engines
          .filter((item) => item && typeof item === "object" && item.url)
          .slice(0, 20)
          .map((item) => ({
            id: String(item.id || "").slice(0, 40),
            name: String(item.name || "").slice(0, 20),
            mark: String(item.mark || "").slice(0, 4),
            url: String(item.url).slice(0, 300),
          }))
      : [],
  };
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
    description: getAttr(html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i)?.[0] || "", "content").slice(0, 320),
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

  if (!["http:", "https:"].includes(pageUrl.protocol) || isPrivateHost(pageUrl.hostname) || pageUrl.username || pageUrl.password) {
    return json({ error: "INVALID_URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    let response;
    for (let hop = 0; hop < 4; hop += 1) {
      response = await fetch(pageUrl.toString(), { headers: { accept: "text/html,application/xhtml+xml" }, redirect: "manual", signal: controller.signal });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || hop === 3) throw new Error("Invalid redirect");
      pageUrl = new URL(location, pageUrl);
      if (!["http:", "https:"].includes(pageUrl.protocol) || isPrivateHost(pageUrl.hostname) || pageUrl.username || pageUrl.password) throw new Error("Private redirect blocked");
    }

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

async function handleSync(request, env, syncKey) {
  const respond = (data, init = {}) => json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...(init.headers || {}) },
  });
  if (!env.DB) {
    return respond(
      {
        error: "D1_NOT_CONFIGURED",
        message: "Cloudflare D1 binding DB is not configured.",
      },
      { status: 503 },
    );
  }

  if (!syncKey || syncKey.length < 4) {
    return respond({ error: "INVALID_SYNC_KEY" }, { status: 400 });
  }

  await ensureSchema(env.DB);

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT payload, updated_at FROM sync_profiles WHERE sync_key = ?",
    )
      .bind(syncKey)
      .first();

    if (!row) return respond({ exists: false, payload: null, updatedAt: null });

    return respond({
      exists: true,
      payload: JSON.parse(row.payload),
      updatedAt: row.updated_at,
    });
  }

  if (request.method === "POST" || request.method === "PUT") {
    const payload = await request.json().catch(() => null);
    if (!isValidPayload(payload)) {
      return respond({ error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const text = JSON.stringify(buildSyncPayload(payload));

    // Updating an existing code never grants permission to insert a new one.
    // Keeping these as separate SQL operations also closes deletion/create races.
    const existing = await env.DB.prepare("SELECT sync_key FROM sync_profiles WHERE sync_key = ?")
      .bind(syncKey).first();
    if (existing) {
      const result = await env.DB.prepare(
        "UPDATE sync_profiles SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE sync_key = ? RETURNING sync_key",
      ).bind(text, syncKey).first();
      if (!result) {
        return respond({ error: "SYNC_KEY_NOT_FOUND" }, { status: 409 });
      }
      return respond({ ok: true, updated: true });
    }

    if (typeof env.SYNC_CREATE_PASSWORD !== "string" || !env.SYNC_CREATE_PASSWORD) {
      return respond({ error: "SYNC_CREATION_NOT_CONFIGURED" }, { status: 503 });
    }
    const password = request.headers.get("X-Sync-Create-Password") || "";
    if (!password || password.length > 128) {
      return respond({ error: "SYNC_CREATION_PASSWORD_REQUIRED" }, { status: 403 });
    }
    const encoder = new TextEncoder();
    const [suppliedHash, expectedHash] = await Promise.all([
      crypto.subtle.digest("SHA-256", encoder.encode(password)),
      crypto.subtle.digest("SHA-256", encoder.encode(env.SYNC_CREATE_PASSWORD)),
    ]);
    if (!crypto.subtle.timingSafeEqual(suppliedHash, expectedHash)) {
      return respond({ error: "INVALID_SYNC_CREATION_PASSWORD" }, { status: 403 });
    }

    // A concurrent creator must not overwrite the first creator's data.
    const result = await env.DB.prepare(
      `INSERT INTO sync_profiles (sync_key, payload, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(sync_key) DO NOTHING RETURNING sync_key`,
    ).bind(syncKey, text).first();
    if (!result) {
      return respond({ error: "SYNC_KEY_EXISTS" }, { status: 409 });
    }
    return respond({ ok: true, created: true, updated: true });
  }

  return respond({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

/*
 * AI 代理：浏览器直连大模型接口基本都会被 CORS 挡掉（DeepSeek 同样如此），
 * 所以由 Worker 代为转发。这里只做透传，不保存 API Key。
 */
const MAX_AI_REQUEST_BYTES = 60_000;
const MAX_AI_RESPONSE_BYTES = 120_000;

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return true;
  if (/^(127|10)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (host === "[::1]" || host.startsWith("[")) return true;
  return false;
}

async function handleAi(request) {
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const apiKey = String(body.apiKey || "").trim();
  if (!apiKey) {
    return json({ error: "MISSING_API_KEY", message: "请先填写 API Key。" }, { status: 400 });
  }

  const baseUrl = String(body.baseUrl || "https://api.deepseek.com/v1").trim().replace(/\/+$/, "");
  let target;
  try {
    target = new URL(`${baseUrl}/chat/completions`);
  } catch {
    return json({ error: "INVALID_BASE_URL", message: "接口地址格式不正确。" }, { status: 400 });
  }
  if (target.protocol !== "https:" || isPrivateHost(target.hostname)) {
    return json(
      { error: "INVALID_BASE_URL", message: "接口地址必须是公开的 https 地址。" },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 6) : [];
  if (!messages.length) {
    return json({ error: "INVALID_BODY", message: "缺少对话内容。" }, { status: 400 });
  }

  const upstream = {
    model: String(body.model || "deepseek-chat").slice(0, 60),
    messages: messages.map((item) => ({
      role: item?.role === "assistant" ? "assistant" : item?.role === "system" ? "system" : "user",
      content: String(item?.content || "").slice(0, MAX_AI_REQUEST_BYTES),
    })),
    temperature: 0.2,
  };
  if (body.jsonMode) upstream.response_format = { type: "json_object" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(upstream),
      signal: controller.signal,
    });

    const text = await readLimitedText(response, MAX_AI_RESPONSE_BYTES);

    if (!response.ok) {
      return json(
        {
          error: "UPSTREAM_ERROR",
          status: response.status,
          message: text.slice(0, 400) || `上游返回 ${response.status}`,
        },
        { status: 502 },
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json({ error: "UPSTREAM_BAD_JSON", message: text.slice(0, 300) }, { status: 502 });
    }

    return json({
      ok: true,
      content: data?.choices?.[0]?.message?.content || "",
      usage: data?.usage || null,
    });
  } catch (error) {
    return json(
      {
        error: error?.name === "AbortError" ? "TIMEOUT" : "UPSTREAM_FAILED",
        message: error?.name === "AbortError" ? "上游接口超时，请稍后再试。" : String(error?.message || error),
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const syncKey = getSyncKey(url.pathname);
      if (url.pathname === "/api/weather") return await handleWeather(request);
      if (url.pathname === "/api/weather/cities") return await handleCities(request);
      if (url.pathname === "/api/history-detail") return await handleHistoryDetail(request);

      if (isMetadataPath(url.pathname)) {
        return await handleMetadata(request);
      }

      if (isTodayHistoryPath(url.pathname)) {
        return await handleHistory(request, env);
      }

      if (isAiPath(url.pathname)) {
        return await handleAi(request);
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

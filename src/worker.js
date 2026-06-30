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

function isValidPayload(payload) {
  return (
    payload &&
    Array.isArray(payload.shortcuts) &&
    Array.isArray(payload.widgets) &&
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

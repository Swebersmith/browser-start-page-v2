const MAX_PAYLOAD_BYTES = 250_000;
const MAX_METADATA_BYTES = 96_000;

const fallbackHistoryEvents = {
  "01-01": { year: "1912", title: "中华民国临时政府在南京成立。", detail: "孙中山在南京就任临时大总统，中华民国临时政府成立。" },
  "02-12": { year: "1912", title: "清帝退位，中国两千多年君主专制制度结束。", detail: "清帝溥仪颁布退位诏书，清朝统治结束。" },
  "05-04": { year: "1919", title: "五四运动爆发，成为中国近现代史的重要节点。", detail: "北京学生举行示威，推动了反帝反封建爱国运动。" },
  "07-01": { year: "1921", title: "中国共产党成立纪念日。", detail: "中国共产党第一次全国代表大会召开于 1921 年，7 月 1 日后来被定为建党纪念日。" },
  "10-01": { year: "1949", title: "中华人民共和国中央人民政府成立。", detail: "中华人民共和国开国大典在北京天安门广场举行。" },
  "12-13": { year: "2014", title: "中国设立南京大屠杀死难者国家公祭日。", detail: "中国首次举行南京大屠杀死难者国家公祭仪式。" },
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

function isAiChatPath(pathname) {
  return pathname === "/api/ai/chat";
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
  return fallbackHistoryEvents[key] || { year: "今天", title: "历史太厚，小新先记下今天要好好生活。" };
}

function normalizeHistoryEvent(event) {
  if (!event || typeof event !== "object") return null;
  const title = event.title || event.event || event.desc || event.content || event.name || event.info;
  const detail = event.desc || event.content || event.detail || event.description || title;
  const year = event.year || event.date || event.time || "";
  if (!title) return null;

  return {
    year: String(year).replace(/[^\d-]/g, "").slice(0, 8) || "今天",
    title: String(title).replace(/\s+/g, " ").trim().slice(0, 80),
    detail: String(detail).replace(/\s+/g, " ").trim().slice(0, 180),
  };
}

function findHistoryEvent(value, todayKeys = getTodayKeys()) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map((item) => findHistoryEvent(item, todayKeys)).find(Boolean) || null;
  if (typeof value !== "object") return null;

  const direct = normalizeHistoryEvent(value);
  if (direct) return direct;

  for (const key of todayKeys) {
    const match = findHistoryEvent(value[key], todayKeys);
    if (match) return match;
  }

  for (const key of ["data", "result", "list", "events", "content"]) {
    const match = findHistoryEvent(value[key], todayKeys);
    if (match) return match;
  }

  return null;
}

async function handleTodayHistory(request) {
  if (request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const now = new Date();
  const todayKeys = getTodayKeys(now);
  const historyApis = [
    "https://api.oioweb.cn/api/common/history",
    "https://api.vvhan.com/api/history?type=json",
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
      const picked = findHistoryEvent(data, todayKeys);
      if (picked) return json({ ...picked, source: new URL(apiUrl).hostname });
    } catch {
      // Try the next domestic source, then fall back locally.
    } finally {
      clearTimeout(timeout);
    }
  }

  return json({ ...getTodayFallback(now), source: "fallback" });
}

function normalizeAiMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && ["user", "assistant", "system"].includes(message.role) && typeof message.content === "string")
    .slice(-16)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 4000),
    }));
}

function normalizeDeepSeekModel(value) {
  const model = String(value || "").trim();
  return ["deepseek-v4-flash", "deepseek-v4-pro"].includes(model) ? model : "deepseek-v4-flash";
}

async function handleAiChat(request, env) {
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const body = await request.json().catch(() => null);
  const messages = normalizeAiMessages(body?.messages);
  const apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY;
  const model = normalizeDeepSeekModel(body?.model || env.DEEPSEEK_MODEL || env.OPENAI_MODEL);

  if (body?.ping) {
    return json({
      ok: Boolean(apiKey),
      message: apiKey ? "DeepSeek 密钥已配置。" : "Cloudflare Worker 还没有配置 DEEPSEEK_API_KEY。",
    });
  }

  if (!messages.length) {
    return json({ error: "EMPTY_MESSAGES", message: "消息不能为空。" }, { status: 400 });
  }

  if (!apiKey) {
    return json(
      {
        error: "AI_NOT_CONFIGURED",
        message: "Cloudflare Worker 还没有配置 DEEPSEEK_API_KEY。可以先使用本机 Agent 或自定义接口。",
      },
      { status: 503 },
    );
  }

  const baseUrl = String(env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你是网页启动页里的 AI 助手。回答要简洁、可执行。涉及控制电脑时，提醒用户通过本机 Agent 桥接并确认权限。",
        },
        ...messages,
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(
      {
        error: data.error?.code || "AI_REQUEST_FAILED",
        message: data.error?.message || "云端模型请求失败。",
      },
      { status: response.status },
    );
  }

  return json({
    reply: data.choices?.[0]?.message?.content || "云端模型没有返回文本内容。",
    model,
  });
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

      if (isAiChatPath(url.pathname)) {
        return await handleAiChat(request, env);
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

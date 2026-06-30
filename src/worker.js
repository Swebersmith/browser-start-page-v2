const MAX_PAYLOAD_BYTES = 250_000;

const schemaSql = `
CREATE TABLE IF NOT EXISTS sync_profiles (
  sync_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

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

function isValidPayload(payload) {
  return (
    payload &&
    Array.isArray(payload.shortcuts) &&
    Array.isArray(payload.widgets) &&
    JSON.stringify(payload).length <= MAX_PAYLOAD_BYTES
  );
}

async function ensureSchema(db) {
  await db.exec(schemaSql);
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

      if (syncKey) {
        return handleSync(request, env, syncKey);
      }

      return env.ASSETS.fetch(request);
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

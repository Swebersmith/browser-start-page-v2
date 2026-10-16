export function shortcutFingerprint(items) {
  return JSON.stringify(items);
}

export function canonicalUrl(value) {
  try { return new URL(value).href; } catch { return value; }
}

export function reconcileAiResult(content, originals, options = {}) {
  const text = String(content || "").trim();
  let data;
  try { data = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { throw new Error("模型没有返回有效的整理方案，请重试。"); }
  if (!Array.isArray(data.shortcuts) || !data.shortcuts.length) throw new Error("整理方案为空，原快捷方式已保留。");
  const byId = new Map(originals.map(item => [item.id, item]));
  const byUrl = new Map(originals.map(item => [item.url, item]));
  const seen = new Set(), result = [], warnings = [];
  for (const proposed of data.shortcuts) {
    const original = byId.get(proposed?.id) || (!proposed?.id && byUrl.get(proposed?.url));
    if (!original || (proposed.url && proposed.url !== original.url)) throw new Error("方案包含未知或被改写的网址，已阻止应用。请重新整理。");
    if (seen.has(original.id)) continue;
    seen.add(original.id);
    result.push({ ...original,
      name: options.rename !== false ? String(proposed.name || original.name).trim().slice(0, 24) || original.name : original.name,
      category: String(proposed.category || original.category).trim().slice(0, 16) || original.category,
      pinned: options.pinning && typeof proposed.pinned === "boolean" ? proposed.pinned : original.pinned,
      order: result.length,
    });
  }
  const missing = originals.filter(item => !seen.has(item.id));
  if (missing.length) {
    warnings.push(`模型遗漏的 ${missing.length} 项已自动保留。`);
    missing.forEach(item => result.push({ ...item, order: result.length }));
  }
  let merged = 0;
  const unique = [];
  const urls = new Map();
  for (const item of result) {
    const key = canonicalUrl(item.url);
    const prior = urls.get(key);
    if (options.dedupe && prior) { prior.pinned ||= item.pinned; merged += 1; continue; }
    urls.set(key, item); unique.push(item);
  }
  if (options.sort === "name") unique.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (options.sort === "domain") unique.sort((a, b) => new URL(a.url).hostname.localeCompare(new URL(b.url).hostname));
  if (options.sort === "original") unique.sort((a, b) => originals.findIndex(item => item.id === a.id) - originals.findIndex(item => item.id === b.id));
  unique.forEach((item, index) => { item.order = index; });
  return { shortcuts: unique, warnings, merged, summary: String(data.summary || "").slice(0, 400) };
}

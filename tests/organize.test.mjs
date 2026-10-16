import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileAiResult } from "../organize.js";
const items = [
  { id: "one", name: "代码", url: "https://example.com/Code?User=A", category: "常用", pinned: true, icon: "https://example.com/icon.png", color: "#123456", visits: 8, order: 0 },
  { id: "two", name: "阅读", url: "https://example.com/code?User=a", category: "常用", pinned: false, order: 1 },
];
const output = shortcuts => JSON.stringify({ shortcuts });

test("AI may create groups while IDs, URLs, icons, colors and visits remain intact", () => {
  const result = reconcileAiResult(output(items.map(item => ({ id: item.id, name: "优化名称", category: "学习资料", pinned: false }))), items);
  assert.equal(result.shortcuts[0].category, "学习资料");
  for (const key of ["id", "url", "icon", "color", "visits", "pinned"]) assert.equal(result.shortcuts[0][key], items[0][key]);
});

test("omitted shortcuts are restored; unknown IDs and rewritten URLs are rejected", () => {
  const result = reconcileAiResult(output([{ id: "one", category: "开发" }]), items);
  assert.equal(result.shortcuts.length, 2); assert.equal(result.warnings.length, 1);
  assert.throws(() => reconcileAiResult(output([{ id: "alien", url: "https://evil.test" }]), items));
  assert.throws(() => reconcileAiResult(output([{ id: "one", url: "https://evil.test" }]), items));
});

test("deduplication respects case-sensitive paths and query values", () => {
  const result = reconcileAiResult(output(items), items, { dedupe: true });
  assert.equal(result.shortcuts.length, 2);
  const duplicate = { ...items[0], id: "three", pinned: false };
  const merged = reconcileAiResult(output([...items, duplicate]), [...items, duplicate], { dedupe: true });
  assert.equal(merged.shortcuts.length, 2); assert.equal(merged.merged, 1); assert.equal(merged.shortcuts[0].pinned, true);
});

test("rename/pin/sort options are enforced by the client", () => {
  const result = reconcileAiResult(output([{ id: "two", name: "改名", category: "阅读", pinned: true }, { id: "one", pinned: false }]), items, { rename: false, pinning: true, sort: "original" });
  assert.equal(result.shortcuts[0].id, "one"); assert.equal(result.shortcuts[1].name, "阅读"); assert.equal(result.shortcuts[1].pinned, true);
});

test("malformed or empty model results cannot replace bookmarks", () => {
  assert.throws(() => reconcileAiResult("not json", items));
  assert.throws(() => reconcileAiResult('{"shortcuts":[]}', items));
});

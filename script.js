import { initDashboard } from "./dashboard.js";
import { initAiOrganizer } from "./ai-ui.js";

const STORAGE_KEY = "browser-launchpad-shortcuts-v1";
const ENGINE_KEY = "browser-launchpad-engine-v1";
const LEGACY_WIDGETS_KEY = "browser-launchpad-widgets-v1";
const SYNC_KEY = "browser-launchpad-sync-key-v1";
const SEARCH_HISTORY_KEY = "browser-launchpad-search-history-v1";
const DARK_MODE_KEY = "browser-launchpad-dark-mode-v1";
const SITE_NAME_KEY = "browser-launchpad-site-name-v1";
const CUSTOM_ENGINE_KEY = "browser-launchpad-custom-engines-v1";
const PREF_KEY = "browser-launchpad-prefs-v1";
const DEFAULT_SITE_NAME = "快捷首页";
const MAX_SITE_NAME = 30;
const MAX_SEARCH_HISTORY = 8;
const ALL_CATEGORY = "全部";
const DEFAULT_CATEGORY = "常用";

const builtinEngines = [
  { id: "google", name: "Google", mark: "G", url: "https://www.google.com/search?q=" },
  { id: "bing", name: "Bing", mark: "B", url: "https://www.bing.com/search?q=" },
  { id: "baidu", name: "百度", mark: "百", url: "https://www.baidu.com/s?wd=" },
  { id: "duckduckgo", name: "DuckDuckGo", mark: "D", url: "https://duckduckgo.com/?q=" },
  { id: "github", name: "GitHub", mark: "GH", url: "https://github.com/search?q=" },
];
function getEngines() { return [...builtinEngines, ...customEngines]; }

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultShortcuts = [
  { id: createId(), name: "Google", url: "https://www.google.com", category: "常用", color: "#2775d1" },
  { id: createId(), name: "YouTube", url: "https://www.youtube.com", category: "常用", color: "#e8442e" },
  { id: createId(), name: "GitHub", url: "https://github.com", category: "开发", color: "#24292f" },
  { id: createId(), name: "Vercel", url: "https://vercel.com", category: "开发", color: "#111111" },
  { id: createId(), name: "ChatGPT", url: "https://chat.openai.com", category: "AI", color: "#2e9f6f" },
  { id: createId(), name: "Cloudflare", url: "https://dash.cloudflare.com", category: "服务器", color: "#f38020" },
  { id: createId(), name: "宝塔面板", url: "https://www.bt.cn", category: "服务器", color: "#20a53a" },
  { id: createId(), name: "阿里云", url: "https://www.aliyun.com", category: "服务器", color: "#ff6a00" },
];

const elements = {
  dateText: document.querySelector("#dateText"),
  stageTimeText: document.querySelector("#stageTimeText"),
  searchZone: document.querySelector(".search-zone"),
  searchForm: document.querySelector("#searchForm"),
  searchInputWrap: document.querySelector(".search-input-wrap"),
  searchInput: document.querySelector("#searchInput"),
  engineSelectWrap: document.querySelector(".engine-select"),
  engineSelect: document.querySelector("#engineSelect"),
  engineSelectButton: document.querySelector("#engineSelectButton"),
  engineSelectedMark: document.querySelector("#engineSelectedMark"),
  engineSelectedName: document.querySelector("#engineSelectedName"),
  engineMenu: document.querySelector("#engineMenu"),
  categoryTabs: document.querySelector("#categoryTabs"),
  shortcutGrid: document.querySelector("#shortcutGrid"),
  template: document.querySelector("#shortcutTemplate"),
  dialog: document.querySelector("#shortcutDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  shortcutForm: document.querySelector("#shortcutForm"),
  nameInput: document.querySelector("#shortcutName"),
  urlInput: document.querySelector("#shortcutUrl"),
  metadataButton: document.querySelector("#metadataButton"),
  shortcutMetaStatus: document.querySelector("#shortcutMetaStatus"),
  categoryInput: document.querySelector("#shortcutCategory"),
  colorInput: document.querySelector("#shortcutColor"),
  addButton: document.querySelector("#addShortcutButton"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelDialogButton: document.querySelector("#cancelDialogButton"),
  deleteButton: document.querySelector("#deleteShortcutButton"),
  categorySuggestions: document.querySelector("#categorySuggestions"),
  autoColorButton: document.querySelector("#autoColorButton"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  syncKeyInput: document.querySelector("#syncKeyInput"),
  syncCreatePassword: document.querySelector("#syncCreatePassword"),
  syncKeyVisibleToggle: document.querySelector("#syncKeyVisibleToggle"),
  syncEnableButton: document.querySelector("#syncEnableButton"),
  syncPullButton: document.querySelector("#syncPullButton"),
  syncStatus: document.querySelector("#syncStatus"),
  preferencesSyncState: document.querySelector("#preferencesSyncState"),
  darkToggleButton: document.querySelector("#darkToggleButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  closeSettingsDialogButton: document.querySelector("#closeSettingsDialogButton"),
  searchTargetSelect: document.querySelector("#searchTargetSelect"),
  siteNameButton: document.querySelector("#siteNameButton"),
  siteNameText: document.querySelector("#siteNameText"),
  siteNameDialog: document.querySelector("#siteNameDialog"),
  siteNameForm: document.querySelector("#siteNameForm"),
  siteNameInput: document.querySelector("#siteNameInput"),
  closeSiteNameDialogButton: document.querySelector("#closeSiteNameDialogButton"),
  cancelSiteNameDialogButton: document.querySelector("#cancelSiteNameDialogButton"),
  resetSiteNameButton: document.querySelector("#resetSiteNameButton"),
  searchHistory: document.querySelector("#searchHistory"),
  defaultCategorySelect: document.querySelector("#defaultCategorySelect"),
  manageEnginesButton: document.querySelector("#manageEnginesButton"),
  engineDialog: document.querySelector("#engineDialog"),
  engineForm: document.querySelector("#engineForm"),
  engineRows: document.querySelector("#engineRows"),
  addEngineRowButton: document.querySelector("#addEngineRowButton"),
  saveEngineButton: document.querySelector("#saveEngineButton"),
  closeEngineDialogButton: document.querySelector("#closeEngineDialogButton"),
  cancelEngineDialogButton: document.querySelector("#cancelEngineDialogButton"),
};

let shortcuts = loadShortcuts();
let legacyWidgets = loadLegacyWidgets();
let customEngines = loadCustomEngines();
let prefs = loadPrefs();
let searchHistory = loadSearchHistory();
let searchHistoryRequested = false;
let searchHistoryHideTimer = null;
let selectedCategory = prefs.defaultCategory || ALL_CATEGORY;
let editingId = null;
let syncEnabled = false;
let syncRequestPending = false;
let isApplyingRemoteData = false;
let syncSaveTimer = null;
let draggedShortcutId = null;
let metadataLookupTimer = null;
let metadataLookupController = null;
let currentShortcutIconUrl = "";

/* 连续场景：只在交互时测量布局，动画只改变 transform / opacity。 */
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactMotion = window.matchMedia("(pointer: coarse), (max-width: 860px)");
const sceneAnimations = new Set();
const dialogScenes = new WeakMap();
const sceneEase = "cubic-bezier(0.22, 1, 0.36, 1)";

function canAnimateScene() {
  return !reducedMotion.matches && !document.hidden && typeof Element.prototype.animate === "function";
}

function playSceneMotion(node, frames, options) {
  const animation = node.animate(frames, { easing: sceneEase, ...options });
  sceneAnimations.add(animation);
  const release = () => sceneAnimations.delete(animation);
  animation.finished.then(release, release);
  return animation;
}

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) sceneAnimations.forEach((animation) => animation.cancel());
});

function readShortcutScene() {
  const positions = new Map();
  const nodes = document.querySelectorAll(".shortcut-card, .weather-stage");
  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      positions.set(node.dataset.shortcutId || node, rect);
    }
  });
  return positions;
}

function animateShortcutScene(previous) {
  const compact = compactMotion.matches;
  const limit = compact ? 12 : 24;
  let count = 0;
  const moves = [];
  // 先批量读取，再批量启动动画，避免读写交替触发重复布局。
  document.querySelectorAll(".shortcut-card, .weather-stage").forEach((node) => {
    const next = node.getBoundingClientRect();
    if (next.bottom <= 0 || next.top >= window.innerHeight || count >= limit) return;
    const before = previous.get(node.dataset.shortcutId || node);
    const dx = before ? before.left - next.left : 0;
    const dy = before ? before.top - next.top : compact ? 8 : 16;
    if (before && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    moves.push({ node, dx, dy, entering: !before });
    count += 1;
  });
  moves.forEach(({ node, dx, dy, entering }, index) => {
    playSceneMotion(node, [
      { transform: `translate(${dx}px, ${dy}px) scale(${Math.abs(dx) > Math.abs(dy) ? "1.025, 0.98" : "0.98, 1.025"})`, opacity: entering ? 0 : 1 },
      { transform: "translate(0, -1px) scale(1.012, 0.99)", opacity: 1, offset: 0.72 },
      { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
    ], { duration: compact ? 340 : 480, delay: entering ? Math.min(index * 12, 60) : 0, fill: "backwards" });
  });
}

function surfaceOrigin(source, rect) {
  const origin = source?.isConnected ? source.getBoundingClientRect() : null;
  if (!origin?.width || !origin?.height) return "translate(0, 16px) scale(0.94, 0.98)";
  const dx = origin.left + origin.width / 2 - rect.left - rect.width / 2;
  const dy = origin.top + origin.height / 2 - rect.top - rect.height / 2;
  const sx = Math.min(1.2, Math.max(0.035, origin.width / rect.width));
  const sy = Math.min(1.2, Math.max(0.035, origin.height / rect.height));
  return `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
}

function openSurface(dialog, source = document.activeElement) {
  if (!dialog || dialog.open) return;
  const opener = document.activeElement;
  dialog.classList.remove("is-closing");
  dialog.showModal();
  const rect = dialog.getBoundingClientRect();
  const state = { opener, source, transform: surfaceOrigin(source, rect), animation: null, contentAnimation: null, closing: false };
  dialogScenes.set(dialog, state);
  if (canAnimateScene()) {
    source?.classList.add("is-origin-active");
    state.animation = playSceneMotion(dialog, [
      { opacity: 0.25, transform: state.transform, offset: 0, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      { opacity: 1, transform: "translate(0, -3px) scale(1.028, 0.978)", offset: 0.62, easing: "ease-in-out" },
      { opacity: 1, transform: "translate(0, 1px) scale(0.994, 1.009)", offset: 0.82, easing: "ease-out" },
      { opacity: 1, transform: "translate(0, 0) scale(1, 1)" },
    ], { duration: compactMotion.matches ? 400 : 500, easing: "linear" });
    const card = dialog.querySelector(".dialog-card");
    if (card) state.contentAnimation = playSceneMotion(card, [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.13 }, { opacity: 1, offset: 0.65 }, { opacity: 1 },
    ], { duration: compactMotion.matches ? 320 : 430, easing: "linear" });
  }
}

function closeSurface(dialog) {
  if (!dialog?.open) return;
  const state = dialogScenes.get(dialog);
  if (state?.closing) return;
  dialog.dispatchEvent(new Event("surfaceclosing"));
  // 读取当前画面后再取消入场，快速开关时也从当前状态连续返回。
  const current = getComputedStyle(dialog);
  const start = { opacity: current.opacity, transform: current.transform };
  state?.animation?.cancel();
  state?.contentAnimation?.cancel();
  if (!state || !canAnimateScene()) {
    dialog.close();
    return;
  }
  state.closing = true;
  dialog.classList.add("is-closing");
  const destination = surfaceOrigin(state.source, dialog.getBoundingClientRect());
  state.animation = playSceneMotion(dialog, [start,
    { opacity: 1, transform: "translate(0, 3px) scale(0.975, 1.025)", offset: 0.18, easing: "cubic-bezier(0.6, 0, 0.8, 0.2)" },
    { opacity: 0, transform: destination },
  ], {
    duration: compactMotion.matches ? 260 : 330, easing: "linear",
    fill: "forwards",
  });
  const finish = () => {
    dialog.close();
    state.animation.cancel();
    dialog.classList.remove("is-closing");
  };
  state.animation.finished.then(finish, finish);
}

document.querySelectorAll("dialog").forEach((dialog) => {
  let startedOnBackdrop = false;
  const isBackdropPoint = (event) => {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  };
  // 按下、松开都在弹窗外才关闭，避免从输入框拖选文字到外部时误退出。
  dialog.addEventListener("pointerdown", (event) => {
    startedOnBackdrop = event.isPrimary && event.button === 0 && isBackdropPoint(event);
  });
  dialog.addEventListener("pointercancel", () => {
    startedOnBackdrop = false;
  });
  dialog.addEventListener("click", (event) => {
    const dismiss = startedOnBackdrop && isBackdropPoint(event);
    startedOnBackdrop = false;
    if (dismiss) closeSurface(dialog);
  });
  dialog.addEventListener("submit", (event) => {
    if (!dialogScenes.get(dialog)?.closing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSurface(dialog);
  });
  dialog.addEventListener("close", () => {
    const state = dialogScenes.get(dialog);
    state?.animation?.cancel();
    state?.contentAnimation?.cancel();
    state?.source?.classList.remove("is-origin-active");
    dialog.classList.remove("is-closing");
    if (state?.opener?.isConnected) state.opener.focus({ preventScroll: true });
    dialogScenes.delete(dialog);
  });
});

// A short press deforms around the touch point and releases with a damped spring.
const pressMotions = new WeakMap();
let pressedControl = null;
document.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0 || !canAnimateScene()) return;
  const target = event.target.closest("button:not(:disabled)");
  if (!target || target.closest(".is-closing")) return;
  pressedControl = target;
  pressMotions.get(target)?.cancel();
  pressMotions.set(target, playSceneMotion(target, [{ transform: "scale(1, 1)" }, { transform: "scale(0.955, 1.025)" }], { duration: 100, fill: "forwards" }));
}, { passive: true });
function releasePress() {
  const target = pressedControl; pressedControl = null;
  if (!target) return;
  const transform = getComputedStyle(target).transform;
  pressMotions.get(target)?.cancel();
  if (!canAnimateScene()) return;
  pressMotions.set(target, playSceneMotion(target, [{ transform }, { transform: "scale(1.025, 0.985)", offset: 0.55 }, { transform: "scale(1, 1)" }], { duration: 280 }));
}
document.addEventListener("pointerup", releasePress, { passive: true });
document.addEventListener("pointercancel", releasePress, { passive: true });
window.addEventListener("blur", releasePress);

elements.dialog.addEventListener("close", () => {
  metadataLookupController?.abort();
  window.clearTimeout(metadataLookupTimer);
  editingId = null;
  currentShortcutIconUrl = "";
  setShortcutMetaStatus("");
  elements.shortcutForm.reset();
});
elements.settingsDialog.addEventListener("close", () => {
  elements.settingsButton.setAttribute("aria-expanded", "false");
  elements.syncCreatePassword.value = "";
});

function normalizeShortcut(item, index = 0) {
  return {
    id: item.id || createId(),
    name: String(item.name || "").slice(0, 24),
    url: normalizeUrl(String(item.url || "")),
    category: String(item.category || DEFAULT_CATEGORY).slice(0, 16),
    color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : getColorFromUrl(String(item.url || "")),
    pinned: Boolean(item.pinned),
    icon: typeof item.icon === "string" ? item.icon : "",
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    visits: Math.max(0, Number(item.visits) || 0),
    lastVisited: typeof item.lastVisited === "string" ? item.lastVisited.slice(0, 32) : "",
  };
}

function loadShortcuts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultShortcuts;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed.map((item, index) => normalizeShortcut(item, index)).filter((item) => item.url)
      : defaultShortcuts;
  } catch {
    return defaultShortcuts;
  }
}

function saveShortcuts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  document.dispatchEvent(new Event("shortcutschange"));
  scheduleCloudSave();
}

/* 仅透传旧版同步字段，已移除小组件界面和编辑功能，避免覆盖已有数据。 */
function loadLegacyWidgets() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_WIDGETS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/* ---------- 自定义搜索引擎 / 偏好 / AI 配置 ---------- */

function normalizeEngine(item, index = 0) {
  const name = String(item?.name || "").trim().slice(0, 20);
  return {
    id: String(item?.id || `custom-${index}-${createId()}`).slice(0, 40),
    name,
    mark: String(item?.mark || "").trim().slice(0, 4) || name.slice(0, 2) || "?",
    url: String(item?.url || "").trim().slice(0, 300),
  };
}

function loadCustomEngines() {
  const raw = localStorage.getItem(CUSTOM_ENGINE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeEngine).filter((item) => item.name && item.url).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function saveCustomEngines() {
  localStorage.setItem(CUSTOM_ENGINE_KEY, JSON.stringify(customEngines));
  scheduleCloudSave();
}

function loadPrefs() {
  const base = { defaultCategory: "", searchTarget: "_self" };
  const raw = localStorage.getItem(PREF_KEY);
  if (!raw) return base;

  try {
    const parsed = JSON.parse(raw);
    return {
      defaultCategory: typeof parsed?.defaultCategory === "string" ? parsed.defaultCategory.slice(0, 16) : "",
      searchTarget: parsed?.searchTarget === "_blank" ? "_blank" : "_self",
    };
  } catch {
    return base;
  }
}

/* 搜索结果的打开方式：_self = 当前页面，_blank = 新标签页 */
function getSearchTarget() {
  return prefs.searchTarget === "_blank" ? "_blank" : "_self";
}

function setSearchTarget(target) {
  prefs = { ...prefs, searchTarget: target === "_blank" ? "_blank" : "_self" };
  savePrefs();
  renderSearchTarget();
}

function savePrefs() {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  scheduleCloudSave();
}

function loadSearchHistory() {
  const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim()).slice(0, MAX_SEARCH_HISTORY)
      : [];
  } catch {
    return [];
  }
}

function saveSearchHistory({ sync = true } = {}) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  renderSearchHistory();
  if (sync) scheduleCloudSave();
}

function addSearchHistory(query) {
  const value = query.trim();
  if (!value) return;
  searchHistory = [value, ...searchHistory.filter((item) => item !== value)].slice(0, MAX_SEARCH_HISTORY);
  saveSearchHistory();
}

function removeSearchHistory(query) {
  searchHistory = searchHistory.filter((item) => item !== query);
  saveSearchHistory();
}

function renderSearchHistory() {
  elements.searchHistory.innerHTML = "";

  if (!searchHistory.length || !searchHistoryRequested || document.activeElement !== elements.searchInput) {
    elements.searchHistory.hidden = true;
    return;
  }

  const filter = elements.searchInput.value.trim().toLowerCase();
  const visibleHistory = searchHistory.filter((item) => item.toLowerCase().includes(filter)).slice(0, MAX_SEARCH_HISTORY);
  elements.searchHistory.hidden = !visibleHistory.length;

  visibleHistory.forEach((query) => {
    const item = document.createElement("div");
    const searchButton = document.createElement("button");
    const removeButton = document.createElement("button");

    item.className = "history-item";
    searchButton.type = "button";
    searchButton.className = "history-query";
    searchButton.textContent = query;
    searchButton.addEventListener("mousedown", (event) => event.preventDefault());
    searchButton.addEventListener("click", () => {
      elements.searchInput.value = query;
      runSearch(query);
    });

    removeButton.type = "button";
    removeButton.className = "history-remove";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `删除搜索记录：${query}`);
    removeButton.addEventListener("mousedown", (event) => event.preventDefault());
    removeButton.addEventListener("click", () => removeSearchHistory(query));

    item.append(searchButton, removeButton);
    elements.searchHistory.append(item);
  });
}

function hideSearchHistory() {
  window.clearTimeout(searchHistoryHideTimer);
  searchHistoryHideTimer = null;
  searchHistoryRequested = false;
  elements.searchHistory.hidden = true;
}

function cancelSearchHistoryHide() {
  window.clearTimeout(searchHistoryHideTimer);
  searchHistoryHideTimer = null;
}

function scheduleSearchHistoryHide() {
  cancelSearchHistoryHide();
  searchHistoryHideTimer = window.setTimeout(hideSearchHistory, 180);
}

function runSearch(query) {
  const value = query.trim();
  if (!value) return;

  hideSearchHistory();
  addSearchHistory(value);
  flushCloudData();

  const target = getSearchTarget();
  if (looksLikeUrl(value)) {
    window.open(normalizeUrl(value), target);
    return;
  }

  const engines = getEngines();
  const engine = engines.find((item) => item.id === elements.engineSelect.value) || engines[0];
  window.open(`${engine.url}${encodeURIComponent(value)}`, target);
}

function setSyncStatus(message, tone = "neutral") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.dataset.tone = tone;
  elements.preferencesSyncState.textContent = tone === "danger" ? "同步待重试" : syncEnabled ? "同步已启用" : "仅本机";
  elements.preferencesSyncState.dataset.tone = tone;
}

function getSyncPayload() {
  return {
    shortcuts,
    widgets: legacyWidgets,
    searchHistory,
    siteName: loadSiteName(),
    defaultCategory: prefs.defaultCategory || "",
    searchTarget: getSearchTarget(),
    engines: customEngines,
  };
}

function flushCloudData() {
  const syncKey = localStorage.getItem(SYNC_KEY);
  if (!syncEnabled || !syncKey || isApplyingRemoteData) return;

  const url = `/api/sync/${encodeURIComponent(syncKey)}`;
  const body = JSON.stringify(getSyncPayload());
  const blob = new Blob([body], { type: "application/json" });

  if (navigator.sendBeacon?.(url, blob)) return;

  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

async function requestSync(method, syncKey, payload = null, creationPassword = "") {
  const headers = payload ? { "content-type": "application/json" } : {};
  if (creationPassword) headers["X-Sync-Create-Password"] = creationPassword;
  const response = await fetch(`/api/sync/${encodeURIComponent(syncKey)}`, {
    method,
    headers,
    cache: "no-store",
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      D1_NOT_CONFIGURED: "云端同步还没配置好，先用本机保存也没问题。",
      SYNC_CREATION_NOT_CONFIGURED: "云端尚未设置创建密码，请联系站长。已有同步码仍可使用。",
      SYNC_CREATION_PASSWORD_REQUIRED: "创建新同步码需要填写创建密码。",
      INVALID_SYNC_CREATION_PASSWORD: "创建密码不正确，请再试一次。",
      SYNC_KEY_EXISTS: "这个同步码刚被创建，请点击「拉取云端」连接。",
      SYNC_KEY_NOT_FOUND: "这个同步码已不存在，请重新连接；创建新码需要密码。",
    };
    const message = messages[data.error] || "这次没连上云端，稍后再试一次。";
    throw new Error(message);
  }
  return data;
}

function applyRemotePayload(payload) {
  if (!payload || !Array.isArray(payload.shortcuts)) return;

  isApplyingRemoteData = true;
  shortcuts = payload.shortcuts.map((item, index) => normalizeShortcut(item, index)).filter((item) => item.url);
  if (Array.isArray(payload.widgets)) {
    legacyWidgets = payload.widgets;
    localStorage.setItem(LEGACY_WIDGETS_KEY, JSON.stringify(legacyWidgets));
  }
  searchHistory = Array.isArray(payload.searchHistory)
    ? payload.searchHistory.filter((item) => typeof item === "string" && item.trim()).slice(0, MAX_SEARCH_HISTORY)
    : searchHistory;
  if (typeof payload.siteName === "string" && payload.siteName.trim()) {
    applySiteName(payload.siteName);
  }
  if (Array.isArray(payload.engines)) {
    customEngines = payload.engines
      .map(normalizeEngine)
      .filter((item) => item.name && item.url)
      .slice(0, 20);
    localStorage.setItem(CUSTOM_ENGINE_KEY, JSON.stringify(customEngines));
  }
  if (typeof payload.defaultCategory === "string") {
    prefs = { ...prefs, defaultCategory: payload.defaultCategory.slice(0, 16) };
    selectedCategory = prefs.defaultCategory || ALL_CATEGORY;
  }
  if (payload.searchTarget === "_blank" || payload.searchTarget === "_self") {
    prefs = { ...prefs, searchTarget: payload.searchTarget };
  }
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  renderSearchTarget();
  saveShortcuts();
  saveSearchHistory({ sync: false });
  isApplyingRemoteData = false;

  renderShortcutArea();
  renderSearchHistory();
}

async function pushCloudData(statusMessage = "已同步到云端。") {
  const syncKey = localStorage.getItem(SYNC_KEY);
  if (!syncEnabled || !syncKey || isApplyingRemoteData) return;

  try {
    await requestSync("PUT", syncKey, getSyncPayload());
    setSyncStatus(statusMessage, "ok");
  } catch (error) {
    setSyncStatus(error.message, "danger");
  }
}

function scheduleCloudSave() {
  if (!syncEnabled || isApplyingRemoteData) return;
  window.clearTimeout(syncSaveTimer);
  syncSaveTimer = window.setTimeout(() => {
    pushCloudData();
  }, 450);
}

async function pullCloudData({ createIfMissing = false } = {}) {
  if (syncRequestPending) return;
  const syncKey = elements.syncKeyInput.value.trim();
  if (syncKey.length < 4) {
    setSyncStatus("同步码至少 4 个字符，长一点会更安全。", "neutral");
    return;
  }

  window.clearTimeout(syncSaveTimer);
  syncEnabled = false;
  syncRequestPending = true;
  elements.syncKeyInput.value = syncKey;
  elements.syncEnableButton.textContent = "正在连接…";
  elements.syncEnableButton.disabled = true;
  elements.syncPullButton.disabled = true;
  elements.syncKeyInput.disabled = true;
  setSyncStatus("小新正在连云端…", "neutral");

  try {
    const data = await requestSync("GET", syncKey);
    if (data.exists) {
      applyRemotePayload(data.payload);
      localStorage.setItem(SYNC_KEY, syncKey);
      syncEnabled = true;
      setSyncStatus(`已拉取云端数据：${data.updatedAt || "刚刚更新"}`, "ok");
      return;
    }

    if (createIfMissing) {
      const password = elements.syncCreatePassword.value;
      if (!password) {
        setSyncStatus("这是新的同步码，请先填写创建密码。", "neutral");
        elements.syncCreatePassword.focus();
        return;
      }
      await requestSync("PUT", syncKey, getSyncPayload(), password);
      localStorage.setItem(SYNC_KEY, syncKey);
      syncEnabled = true;
      setSyncStatus("已验证密码，并用本机数据创建新同步码。", "ok");
    } else {
      setSyncStatus("未找到这个同步码。创建新码请填写创建密码，再点「启用同步」。", "neutral");
    }
  } catch (error) {
    syncEnabled = false;
    setSyncStatus(error.message, "danger");
  } finally {
    elements.syncCreatePassword.value = "";
    syncRequestPending = false;
    elements.syncEnableButton.textContent = syncEnabled ? "同步已启用" : "启用同步";
    elements.syncEnableButton.disabled = false;
    elements.syncPullButton.disabled = false;
    elements.syncKeyInput.disabled = false;
  }
}

function initSync() {
  const savedSyncKey = localStorage.getItem(SYNC_KEY) || "";
  elements.syncKeyInput.value = savedSyncKey;
  if (!savedSyncKey) return;

  pullCloudData();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+/.test(value);
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getNameFromUrl(value) {
  try {
    const host = new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
    const name = host.split(".")[0] || host;
    return name
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
      .slice(0, 24);
  } catch {
    return "";
  }
}

function getColorFromUrl(value) {
  const host = getHostname(normalizeUrl(value));
  const palette = ["#e8442e", "#2775d1", "#2e9f6f", "#f38020", "#7c4dff", "#d81b60", "#008373"];
  const total = Array.from(host).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function setShortcutMetaStatus(message = "", tone = "neutral") {
  elements.shortcutMetaStatus.textContent = message;
  elements.shortcutMetaStatus.dataset.tone = tone;
}

function getSortedShortcuts(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });
}

function getVisibleShortcuts() {
  const visible =
    selectedCategory === ALL_CATEGORY
      ? shortcuts
      : shortcuts.filter((shortcut) => shortcut.category === selectedCategory);
  return getSortedShortcuts(visible);
}

function getTopShortcutOrder() {
  const orders = shortcuts.map((shortcut) => Number(shortcut.order)).filter(Number.isFinite);
  return orders.length ? Math.min(...orders) - 1 : 0;
}

async function fetchShortcutMetadata(value, { silent = false } = {}) {
  const trimmed = value.trim();
  if (!trimmed || !looksLikeUrl(trimmed)) return null;

  metadataLookupController?.abort();
  metadataLookupController = new AbortController();
  const timeout = window.setTimeout(() => metadataLookupController.abort(), 9000);

  if (!silent) {
    setShortcutMetaStatus("正在识别网站信息...", "neutral");
    elements.metadataButton.disabled = true;
  }

  try {
    const url = normalizeUrl(trimmed);
    const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, {
      signal: metadataLookupController.signal,
    });
    const metadata = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(metadata.error || "METADATA_FAILED");
    return metadata;
  } catch (error) {
    if (error.name !== "AbortError" && !silent) {
      setShortcutMetaStatus("暂时没识别到网站信息，已保留手动填写。", "danger");
    }
    return null;
  } finally {
    window.clearTimeout(timeout);
    if (!silent) elements.metadataButton.disabled = false;
  }
}

function applyShortcutMetadata(metadata, { force = false } = {}) {
  if (!metadata) return false;
  let applied = false;

  if (metadata.title && (force || !elements.nameInput.value.trim())) {
    elements.nameInput.value = String(metadata.title).slice(0, 24);
    applied = true;
  }

  if (isHexColor(metadata.color) && (force || elements.colorInput.value === "#e8442e")) {
    elements.colorInput.value = metadata.color;
    applied = true;
  }

  if (metadata.icon) {
    currentShortcutIconUrl = metadata.icon;
    applied = true;
  }

  return applied;
}

async function lookupShortcutMetadata({ force = false, silent = false } = {}) {
  const value = elements.urlInput.value.trim();
  if (!value || !looksLikeUrl(value)) return;

  const metadata = await fetchShortcutMetadata(value, { silent });
  const applied = applyShortcutMetadata(metadata, { force });
  if (!silent) {
    setShortcutMetaStatus(applied ? "已识别网站标题、图标和配色。" : "没有找到更多信息，可继续手动填写。", applied ? "ok" : "neutral");
  }
}

function scheduleShortcutMetadataLookup() {
  window.clearTimeout(metadataLookupTimer);
  metadataLookupTimer = window.setTimeout(() => {
    lookupShortcutMetadata({ silent: true });
  }, 650);
}

function getShortcutIconUrls(value) {
  try {
    const url = new URL(normalizeUrl(value));
    const host = url.hostname;
    const cleanHost = host.replace(/^www\./, "");
    const cachedHosts = [...new Set([host, cleanHost])];

    return [
      `${url.origin}/favicon.ico`,
      ...cachedHosts.map((domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`),
    ];
  } catch {
    return [];
  }
}

function applyShortcutIcon(icon, shortcut) {
  const preferredIcon = typeof shortcut.icon === "string" ? shortcut.icon.trim() : "";
  const candidates = [...new Set([preferredIcon, ...getShortcutIconUrls(shortcut.url)].filter(Boolean))];
  let candidateIndex = 0;

  icon.classList.remove("has-favicon");
  icon.innerHTML = "";
  const fallback = document.createElement("span");
  fallback.className = "shortcut-fallback";
  fallback.textContent = getInitials(shortcut.name);
  icon.append(fallback);
  icon.style.background = shortcut.color;

  if (!candidates.length) return;

  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  image.referrerPolicy = "no-referrer";
  image.style.visibility = "hidden";
  icon.append(image);

  const tryNextIcon = () => {
    if (candidateIndex >= candidates.length) {
      image.remove();
      return;
    }
    image.src = candidates[candidateIndex];
    candidateIndex += 1;
  };

  image.onload = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      tryNextIcon();
      return;
    }

    icon.classList.add("has-favicon");
    fallback.hidden = true;
    image.style.visibility = "";
  };
  image.onerror = tryNextIcon;
  tryNextIcon();
}

function updateCategorySuggestions() {
  const categories = [...new Set(shortcuts.map((item) => item.category).filter(Boolean))];
  elements.categorySuggestions.innerHTML = "";
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    elements.categorySuggestions.append(option);
  });
}

function autofillShortcutFromUrl({ forceColor = false } = {}) {
  const url = elements.urlInput.value.trim();
  if (!url) return;

  if (!elements.nameInput.value.trim()) {
    elements.nameInput.value = getNameFromUrl(url);
  }

  if (forceColor || elements.colorInput.value === "#e8442e") {
    elements.colorInput.value = getColorFromUrl(url);
  }
}

function getInitials(name) {
  const clean = name.trim();
  if (!clean) return "?";
  const asciiWords = clean.match(/[a-z0-9]+/gi);
  if (asciiWords?.length) {
    return asciiWords.slice(0, 2).map((word) => word[0]).join("");
  }
  return Array.from(clean).slice(0, 2).join("");
}

let clockTimer = null;
let lastClockKey = "";

function updateClock() {
  const now = new Date();
  const timeText = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 界面只显示到分钟，同一分钟内不再重复格式化日期 / 写 DOM
  const clockKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()} ${timeText}`;
  if (clockKey === lastClockKey) return;
  lastClockKey = clockKey;

  const dateText = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekText = now.toLocaleDateString("zh-CN", { weekday: "long" });
  elements.stageTimeText.textContent = timeText;
  elements.dateText.textContent = `${dateText} ${weekText}`;
}

/* 对齐到整分钟再更新，代替原本每秒触发一次的 setInterval */
function scheduleClock() {
  window.clearTimeout(clockTimer);
  updateClock();
  const now = new Date();
  const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 60;
  clockTimer = window.setTimeout(scheduleClock, delay);
}

/* ---------- 站名（浏览器标签页标题） ---------- */

function loadSiteName() {
  const saved = (localStorage.getItem(SITE_NAME_KEY) || "").trim();
  return saved || DEFAULT_SITE_NAME;
}

function applySiteName(name) {
  const value = (name || "").trim().slice(0, MAX_SITE_NAME) || DEFAULT_SITE_NAME;
  document.title = value;
  if (elements.siteNameText) elements.siteNameText.textContent = value;
  localStorage.setItem(SITE_NAME_KEY, value);
}

function openSiteNameDialog() {
  if (!elements.siteNameDialog) return;
  elements.siteNameInput.value = loadSiteName();
  openSurface(elements.siteNameDialog);
  elements.siteNameInput.focus();
  elements.siteNameInput.select();
}

function closeSiteNameDialog() {
  closeSurface(elements.siteNameDialog);
}

function saveSiteNameFromDialog(event) {
  event.preventDefault();
  applySiteName(elements.siteNameInput.value);
  closeSiteNameDialog();
  scheduleCloudSave();
}

/* ---------- 偏好设置：默认分组 ---------- */

function renderDefaultCategoryOptions() {
  const select = elements.defaultCategorySelect;
  if (!select) return;

  const categories = [...new Set(shortcuts.map((item) => item.category).filter(Boolean))].sort();
  const current = prefs.defaultCategory || "";

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "全部（不筛选）";
  select.append(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.append(option);
  });

  select.value = categories.includes(current) ? current : "";
}

function setDefaultCategory(value) {
  const category = String(value || "").slice(0, 16);
  prefs = { ...prefs, defaultCategory: category };
  savePrefs();
  selectedCategory = category || ALL_CATEGORY;
  renderShortcutArea();
}

/* ---------- 搜索结果打开方式 ---------- */

function renderSearchTarget() {
  elements.searchTargetSelect.value = getSearchTarget();
}

function openSettingsDialog() {
  closeEngineMenu();
  openSurface(elements.settingsDialog);
  elements.settingsButton.setAttribute("aria-expanded", "true");
}

/* ---------- 自定义搜索引擎 ---------- */

function createEngineRow(engine = {}) {
  const row = document.createElement("div");
  row.className = "engine-row";
  row.dataset.id = engine.id || "";

  const name = document.createElement("input");
  name.type = "text";
  name.className = "engine-row-name";
  name.maxLength = 20;
  name.placeholder = "名称，如 知乎";
  name.value = engine.name || "";

  const mark = document.createElement("input");
  mark.type = "text";
  mark.className = "engine-row-mark";
  mark.maxLength = 4;
  mark.placeholder = "图标";
  mark.value = engine.mark || "";

  const url = document.createElement("input");
  url.type = "text";
  url.inputMode = "url";
  url.className = "engine-row-url";
  url.placeholder = "https://example.com/search?q=";
  url.value = engine.url || "";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "engine-row-remove";
  remove.setAttribute("aria-label", "删除这个搜索引擎");
  remove.textContent = "×";
  remove.addEventListener("click", () => row.remove());

  row.append(name, mark, url, remove);
  return row;
}

function openEngineDialog() {
  if (!elements.engineDialog) return;

  elements.engineRows.innerHTML = "";
  const list = customEngines.length ? customEngines : [{}];
  list.forEach((engine) => elements.engineRows.append(createEngineRow(engine)));
  openSurface(elements.engineDialog);
}

function closeEngineDialog() {
  closeSurface(elements.engineDialog);
}

function saveEnginesFromDialog(event) {
  event.preventDefault();

  const next = [];
  for (const row of elements.engineRows.querySelectorAll(".engine-row")) {
    const name = row.querySelector(".engine-row-name").value.trim();
    const mark = row.querySelector(".engine-row-mark").value.trim();
    const url = row.querySelector(".engine-row-url").value.trim();
    if (!name && !url) continue;
    if (!name || !url) {
      window.alert("每个搜索引擎都要填名称和搜索地址。");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      window.alert("搜索地址要以 http:// 或 https:// 开头。");
      return;
    }
    next.push(normalizeEngine({ id: row.dataset.id || undefined, name, mark, url }, next.length));
  }

  customEngines = next.slice(0, 20);
  saveCustomEngines();
  renderEngines();
  closeEngineDialog();
}

function renderEngines() {
  elements.engineSelect.innerHTML = "";
  elements.engineMenu.innerHTML = "";

  const engines = getEngines();
  const savedEngine = localStorage.getItem(ENGINE_KEY) || engines[0].id;
  engines.forEach((engine) => {
    const option = document.createElement("option");
    option.value = engine.id;
    option.textContent = engine.name;
    elements.engineSelect.append(option);

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = `engine-option engine-${engine.id}`;
    menuButton.dataset.engine = engine.id;
    menuButton.setAttribute("role", "option");
    menuButton.innerHTML = `
      <span class="engine-mark">${engine.mark}</span>
      <span class="engine-option-copy">
        <strong>${engine.name}</strong>
        <small>${engine.url.replace(/^https?:\/\//, "").split("/")[0]}</small>
      </span>
    `;
    menuButton.addEventListener("click", () => {
      setEngine(engine.id);
      closeEngineMenu();
      elements.engineSelectButton.focus();
    });
    elements.engineMenu.append(menuButton);
  });

  setEngine(savedEngine);
}

function closeEngineMenu() {
  elements.searchZone.classList.remove("is-menu-open");
  elements.engineSelectWrap.classList.remove("is-open");
  elements.engineSelectButton.setAttribute("aria-expanded", "false");
}

function openEngineMenu() {
  elements.searchZone.classList.add("is-menu-open");
  elements.engineSelectWrap.classList.add("is-open");
  elements.engineSelectButton.setAttribute("aria-expanded", "true");
}

function toggleEngineMenu() {
  if (elements.engineSelectWrap.classList.contains("is-open")) {
    closeEngineMenu();
  } else {
    openEngineMenu();
  }
}

function focusActiveEngineOption() {
  const activeOption = elements.engineMenu.querySelector(".engine-option.is-active");
  activeOption?.focus();
}

function setEngine(engineId) {
  const engines = getEngines();
  const fallback = engines[0].id;
  const nextId = engines.some((engine) => engine.id === engineId) ? engineId : fallback;
  const currentEngine = engines.find((engine) => engine.id === nextId) || engines[0];

  elements.engineSelect.value = nextId;
  elements.engineSelectedMark.textContent = currentEngine.mark;
  elements.engineSelectedName.textContent = currentEngine.name;
  elements.engineSelectButton.className = `engine-select-button engine-${nextId}`;
  document.documentElement.dataset.engine = nextId;
  localStorage.setItem(ENGINE_KEY, nextId);

  elements.engineMenu.querySelectorAll(".engine-option").forEach((button) => {
    const isActive = button.dataset.engine === nextId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function renderCategories() {
  const categories = [ALL_CATEGORY, ...new Set(shortcuts.map((item) => item.category).filter(Boolean))];
  if (!categories.includes(selectedCategory)) selectedCategory = ALL_CATEGORY;

  updateCategorySuggestions();
  elements.categoryTabs.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.category = category;
    button.textContent = category;
    button.classList.toggle("is-active", category === selectedCategory);
    button.addEventListener("click", () => {
      setCategory(category);
    });
    elements.categoryTabs.append(button);
  });
}

function updateCategoryTabs() {
  elements.categoryTabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === selectedCategory);
  });
}

function setCategory(category) {
  if (selectedCategory === category) return;
  selectedCategory = category;
  updateCategoryTabs();
  renderShortcuts({ animate: true });
}

function updateVisibleShortcutOrder(orderedShortcuts) {
  orderedShortcuts.forEach((shortcut, index) => {
    shortcut.order = index;
  });
}

function moveShortcutInView(draggedId, targetId = null) {
  if (!draggedId || draggedId === targetId) return;

  const ordered = getVisibleShortcuts();
  const fromIndex = ordered.findIndex((shortcut) => shortcut.id === draggedId);
  if (fromIndex < 0) return;

  const [dragged] = ordered.splice(fromIndex, 1);
  const targetIndex = targetId ? ordered.findIndex((shortcut) => shortcut.id === targetId) : -1;
  if (targetIndex < 0) {
    ordered.push(dragged);
  } else {
    const target = ordered[targetIndex];
    dragged.pinned = Boolean(target.pinned);
    ordered.splice(targetIndex, 0, dragged);
  }

  updateVisibleShortcutOrder(ordered);
  saveShortcuts();
  renderShortcutArea();
}

function toggleShortcutPin(id) {
  const shortcut = shortcuts.find((item) => item.id === id);
  if (!shortcut) return;

  shortcut.pinned = !shortcut.pinned;
  shortcut.order = getTopShortcutOrder();
  saveShortcuts();
  renderShortcutArea();
}

function cleanupShortcutDragState() {
  elements.shortcutGrid.querySelectorAll(".is-dragging, .is-drop-target").forEach((node) => {
    node.classList.remove("is-dragging", "is-drop-target");
  });
  elements.shortcutGrid.classList.remove("is-drag-over");
}

function renderShortcuts({ animate = false } = {}) {
  const previous = animate && canAnimateScene() ? readShortcutScene() : null;
  // 快速切换时先记录当前视觉位置，再取消旧动画，避免过期动画跳回。
  sceneAnimations.forEach((animation) => {
    if (!animation.effect?.target?.closest("dialog")) animation.cancel();
  });
  const visibleShortcuts = getVisibleShortcuts();

  elements.shortcutGrid.innerHTML = "";
  visibleShortcuts.forEach((shortcut) => {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    const link = node.querySelector(".shortcut-link");
    const icon = node.querySelector(".shortcut-icon");
    const title = node.querySelector("strong");
    const host = node.querySelector("small");
    const pinButton = node.querySelector(".pin-shortcut");
    const editButton = node.querySelector(".edit-shortcut");

    node.dataset.shortcutId = shortcut.id;
    node.draggable = true;
    node.classList.toggle("is-pinned", Boolean(shortcut.pinned));
    link.href = shortcut.url;
    link.draggable = false;
    link.addEventListener("click", () => { shortcut.visits = (shortcut.visits || 0) + 1; shortcut.lastVisited = new Date().toISOString(); saveShortcuts(); flushCloudData(); });
    applyShortcutIcon(icon, shortcut);
    title.textContent = shortcut.name;
    host.textContent = getHostname(shortcut.url);
    pinButton.textContent = shortcut.pinned ? "\u2605" : "\u2606";
    pinButton.setAttribute("aria-pressed", String(Boolean(shortcut.pinned)));
    pinButton.title = shortcut.pinned ? "取消置顶" : "置顶";
    pinButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleShortcutPin(shortcut.id);
    });
    editButton.addEventListener("click", () => openDialog(shortcut.id));
    node.addEventListener("dragstart", (event) => {
      draggedShortcutId = shortcut.id;
      node.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", shortcut.id);
    });
    node.addEventListener("dragover", (event) => {
      if (!draggedShortcutId || draggedShortcutId === shortcut.id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      node.classList.add("is-drop-target");
    });
    node.addEventListener("dragleave", () => {
      node.classList.remove("is-drop-target");
    });
    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("is-drop-target");
      moveShortcutInView(draggedShortcutId, shortcut.id);
      draggedShortcutId = null;
    });
    node.addEventListener("dragend", () => {
      draggedShortcutId = null;
      cleanupShortcutDragState();
    });

    elements.shortcutGrid.append(node);
  });

  if (previous) animateShortcutScene(previous);
}

function render() {
  renderCategories();
  renderShortcuts();
  renderDefaultCategoryOptions();
}

function renderShortcutArea() {
  renderCategories();
  renderShortcuts();
  renderDefaultCategoryOptions();
}

function openDialog(id = null) {
  editingId = id;
  const shortcut = shortcuts.find((item) => item.id === id);
  updateCategorySuggestions();
  currentShortcutIconUrl = shortcut?.icon || "";
  setShortcutMetaStatus("");

  elements.dialogTitle.textContent = shortcut ? "编辑快捷方式" : "添加快捷方式";
  elements.nameInput.value = shortcut?.name || "";
  elements.urlInput.value = shortcut?.url || "";
  elements.categoryInput.value = shortcut?.category || (selectedCategory === ALL_CATEGORY ? "" : selectedCategory);
  elements.colorInput.value = shortcut?.color || "#e8442e";
  elements.deleteButton.hidden = !shortcut;
  openSurface(elements.dialog);
  elements.urlInput.focus();
}

function closeDialog() {
  metadataLookupController?.abort();
  window.clearTimeout(metadataLookupTimer);
  closeSurface(elements.dialog);
}

function saveFromDialog(event) {
  event.preventDefault();
  autofillShortcutFromUrl();
  const existing = shortcuts.find((shortcut) => shortcut.id === editingId);
  const data = {
    name: elements.nameInput.value.trim() || getNameFromUrl(elements.urlInput.value) || "新快捷方式",
    url: normalizeUrl(elements.urlInput.value),
    category: elements.categoryInput.value.trim() || DEFAULT_CATEGORY,
    color: elements.colorInput.value,
    pinned: existing?.pinned || false,
    icon: currentShortcutIconUrl,
    order: existing?.order ?? getTopShortcutOrder(),
  };

  if (editingId) {
    shortcuts = shortcuts.map((shortcut) => (shortcut.id === editingId ? { ...shortcut, ...data } : shortcut));
  } else {
    shortcuts = [{ id: createId(), ...data }, ...shortcuts];
  }

  saveShortcuts();
  selectedCategory = data.category;
  closeDialog();
  renderShortcutArea();
}

function deleteEditingShortcut() {
  if (!editingId) return;
  const shortcut = shortcuts.find((item) => item.id === editingId);
  const message = shortcut ? `确定删除「${shortcut.name}」这个快捷方式吗？` : "确定删除这个快捷方式吗？";
  if (!window.confirm(message)) return;
  shortcuts = shortcuts.filter((shortcut) => shortcut.id !== editingId);
  saveShortcuts();
  closeDialog();
  renderShortcutArea();
}

function applyDarkMode(enabled) {
  document.documentElement.dataset.theme = enabled ? "dark" : "";
  localStorage.setItem(DARK_MODE_KEY, enabled ? "1" : "0");
  elements.darkToggleButton.textContent = enabled ? "明" : "暗";
  elements.darkToggleButton.setAttribute("aria-pressed", String(enabled));
}

function initDarkMode() {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  applyDarkMode(saved === null ? Boolean(prefersDark) : saved === "1");
}

function toggleDarkMode() {
  applyDarkMode(document.documentElement.dataset.theme !== "dark");
}

function submitSearch(event) {
  event.preventDefault();
  runSearch(elements.searchInput.value);
}

function exportShortcuts() {
  const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "shortcuts.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importShortcuts(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error("Invalid shortcuts file");
      shortcuts = parsed
        .filter((item) => item.name && item.url)
        .map((item, index) => normalizeShortcut(item, index));
      saveShortcuts();
      selectedCategory = ALL_CATEGORY;
      renderShortcutArea();
    } catch {
      alert("导入失败，请选择正确的 JSON 文件。");
    } finally {
      elements.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

elements.searchForm.addEventListener("submit", submitSearch);
elements.engineSelect.addEventListener("change", (event) => setEngine(event.target.value));
elements.engineSelectButton.addEventListener("click", toggleEngineMenu);
elements.engineSelectButton.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown") return;
  event.preventDefault();
  openEngineMenu();
  focusActiveEngineOption();
});
elements.engineMenu.addEventListener("keydown", (event) => {
  const options = Array.from(elements.engineMenu.querySelectorAll(".engine-option"));
  const currentIndex = options.indexOf(document.activeElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeEngineMenu();
    elements.engineSelectButton.focus();
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + step + options.length) % options.length;
    options[nextIndex]?.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!elements.engineSelectWrap.contains(event.target)) closeEngineMenu();
});
elements.addButton.addEventListener("click", () => openDialog());
elements.closeDialogButton.addEventListener("click", closeDialog);
elements.cancelDialogButton.addEventListener("click", closeDialog);
elements.urlInput.addEventListener("blur", () => {
  autofillShortcutFromUrl();
  lookupShortcutMetadata({ silent: true });
});
elements.urlInput.addEventListener("input", () => {
  const value = elements.urlInput.value.trim();
  currentShortcutIconUrl = "";
  setShortcutMetaStatus("");
  if (!elements.nameInput.value.trim() && looksLikeUrl(value)) autofillShortcutFromUrl();
  if (looksLikeUrl(value)) scheduleShortcutMetadataLookup();
});
elements.metadataButton.addEventListener("click", () => lookupShortcutMetadata({ force: true }));
elements.autoColorButton.addEventListener("click", () => autofillShortcutFromUrl({ forceColor: true }));
elements.shortcutForm.addEventListener("submit", saveFromDialog);
elements.deleteButton.addEventListener("click", deleteEditingShortcut);
elements.exportButton.addEventListener("click", exportShortcuts);
elements.importInput.addEventListener("change", importShortcuts);
elements.searchInput.addEventListener("pointerdown", () => {
  searchHistoryRequested = true;
});
elements.searchInput.addEventListener("focus", () => {
  if (searchHistoryRequested) renderSearchHistory();
});
elements.searchInput.addEventListener("click", renderSearchHistory);
elements.searchInput.addEventListener("input", () => {
  searchHistoryRequested = true;
  renderSearchHistory();
});
elements.searchInput.addEventListener("blur", () => {
  scheduleSearchHistoryHide();
});
elements.searchInputWrap.addEventListener("mouseenter", cancelSearchHistoryHide);
elements.searchInputWrap.addEventListener("mouseleave", scheduleSearchHistoryHide);
elements.searchHistory.addEventListener("mouseenter", cancelSearchHistoryHide);
elements.searchHistory.addEventListener("mouseleave", scheduleSearchHistoryHide);
elements.darkToggleButton.addEventListener("click", toggleDarkMode);
elements.shortcutGrid.addEventListener("dragover", (event) => {
  if (!draggedShortcutId) return;
  event.preventDefault();
  elements.shortcutGrid.classList.add("is-drag-over");
});
elements.shortcutGrid.addEventListener("dragleave", (event) => {
  if (!elements.shortcutGrid.contains(event.relatedTarget)) {
    elements.shortcutGrid.classList.remove("is-drag-over");
  }
});
elements.shortcutGrid.addEventListener("drop", (event) => {
  if (!draggedShortcutId || event.target.closest(".shortcut-card")) return;
  event.preventDefault();
  moveShortcutInView(draggedShortcutId);
  draggedShortcutId = null;
  cleanupShortcutDragState();
});
elements.syncEnableButton.addEventListener("click", () => pullCloudData({ createIfMissing: true }));
elements.syncPullButton.addEventListener("click", () => pullCloudData());
elements.syncKeyVisibleToggle.addEventListener("change", () => {
  elements.syncKeyInput.type = elements.syncKeyVisibleToggle.checked ? "text" : "password";
});
elements.siteNameButton.addEventListener("click", openSiteNameDialog);
elements.siteNameForm.addEventListener("submit", saveSiteNameFromDialog);
elements.closeSiteNameDialogButton.addEventListener("click", closeSiteNameDialog);
elements.cancelSiteNameDialogButton.addEventListener("click", closeSiteNameDialog);
elements.resetSiteNameButton.addEventListener("click", () => {
  elements.siteNameInput.value = DEFAULT_SITE_NAME;
  elements.siteNameInput.focus();
});
elements.defaultCategorySelect.addEventListener("change", (event) => {
  setDefaultCategory(event.target.value);
});
elements.searchTargetSelect.addEventListener("change", (event) => setSearchTarget(event.target.value));
elements.settingsButton.addEventListener("click", openSettingsDialog);
elements.closeSettingsDialogButton.addEventListener("click", () => closeSurface(elements.settingsDialog));
elements.manageEnginesButton.addEventListener("click", openEngineDialog);
elements.engineForm.addEventListener("submit", saveEnginesFromDialog);
elements.addEngineRowButton.addEventListener("click", () => {
  elements.engineRows.append(createEngineRow());
});
elements.closeEngineDialogButton.addEventListener("click", closeEngineDialog);
elements.cancelEngineDialogButton.addEventListener("click", closeEngineDialog);

applySiteName(loadSiteName());
renderSearchTarget();
scheduleClock();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleClock();
});
initDarkMode();
renderEngines();
render();
renderSearchHistory();
initSync();

initDashboard({ openSurface });
initAiOrganizer({ getShortcuts: () => shortcuts, applyShortcuts: list => { shortcuts = list; selectedCategory = ALL_CATEGORY; saveShortcuts(); renderShortcutArea(); }, openSurface, closeSurface });
document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => closeSurface(button.closest("dialog"))));

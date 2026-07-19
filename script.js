const STORAGE_KEY = "browser-launchpad-shortcuts-v1";
const ENGINE_KEY = "browser-launchpad-engine-v1";
const WIDGET_KEY = "browser-launchpad-widgets-v1";
const SYNC_KEY = "browser-launchpad-sync-key-v1";
const SEARCH_HISTORY_KEY = "browser-launchpad-search-history-v1";
const DARK_MODE_KEY = "browser-launchpad-dark-mode-v1";
const MAX_SEARCH_HISTORY = 8;
const ALL_CATEGORY = "全部";
const DEFAULT_CATEGORY = "常用";

const searchEngines = [
  { id: "google", name: "Google", mark: "G", url: "https://www.google.com/search?q=" },
  { id: "bing", name: "Bing", mark: "B", url: "https://www.bing.com/search?q=" },
  { id: "baidu", name: "百度", mark: "百", url: "https://www.baidu.com/s?wd=" },
  { id: "duckduckgo", name: "DuckDuckGo", mark: "D", url: "https://duckduckgo.com/?q=" },
  { id: "github", name: "GitHub", mark: "GH", url: "https://github.com/search?q=" },
];

const weatherCodeMap = {
  0: { label: "晴朗", mark: "晴" },
  1: { label: "大致晴朗", mark: "晴" },
  2: { label: "局部多云", mark: "云" },
  3: { label: "阴天", mark: "阴" },
  45: { label: "有雾", mark: "雾" },
  48: { label: "雾凇", mark: "雾" },
  51: { label: "小毛毛雨", mark: "雨" },
  53: { label: "毛毛雨", mark: "雨" },
  55: { label: "较强毛毛雨", mark: "雨" },
  61: { label: "小雨", mark: "雨" },
  63: { label: "中雨", mark: "雨" },
  65: { label: "大雨", mark: "雨" },
  71: { label: "小雪", mark: "雪" },
  73: { label: "中雪", mark: "雪" },
  75: { label: "大雪", mark: "雪" },
  80: { label: "阵雨", mark: "雨" },
  81: { label: "中等阵雨", mark: "雨" },
  82: { label: "强阵雨", mark: "雨" },
  95: { label: "雷雨", mark: "雷" },
  96: { label: "雷雨伴冰雹", mark: "雷" },
  99: { label: "强雷雨伴冰雹", mark: "雷" },
};

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

const defaultWidgets = [
  { id: createId(), title: "今日便签", type: "note", content: "把常用网站和服务器面板整理到这里。", color: "#ffd54a" },
  { id: createId(), title: "VPS 到期", type: "countdown", content: "2026-12-31", color: "#2775d1" },
  { id: createId(), title: "小新官网", type: "link", content: "https://www.shinchan-app.jp/", color: "#e8442e" },
];

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

const TODAY_HISTORY_PUBLIC_API = "https://60s.viki.moe/v2/today-in-history";

const elements = {
  dateText: document.querySelector("#dateText"),
  stageTimeText: document.querySelector("#stageTimeText"),
  stageDateText: document.querySelector("#stageDateText"),
  weatherIcon: document.querySelector("#weatherIcon"),
  weatherTemp: document.querySelector("#weatherTemp"),
  weatherLocation: document.querySelector("#weatherLocation"),
  weatherDesc: document.querySelector("#weatherDesc"),
  weatherRefreshButton: document.querySelector("#weatherRefreshButton"),
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
  engineButtons: document.querySelector("#engineButtons"),
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
  syncEnableButton: document.querySelector("#syncEnableButton"),
  syncPullButton: document.querySelector("#syncPullButton"),
  syncStatus: document.querySelector("#syncStatus"),
  addWidgetButton: document.querySelector("#addWidgetButton"),
  widgetGrid: document.querySelector("#widgetGrid"),
  widgetTemplate: document.querySelector("#widgetTemplate"),
  widgetDialog: document.querySelector("#widgetDialog"),
  widgetForm: document.querySelector("#widgetForm"),
  widgetDialogTitle: document.querySelector("#widgetDialogTitle"),
  widgetTitle: document.querySelector("#widgetTitle"),
  widgetType: document.querySelector("#widgetType"),
  widgetContent: document.querySelector("#widgetContent"),
  widgetColor: document.querySelector("#widgetColor"),
  closeWidgetDialogButton: document.querySelector("#closeWidgetDialogButton"),
  cancelWidgetDialogButton: document.querySelector("#cancelWidgetDialogButton"),
  deleteWidgetButton: document.querySelector("#deleteWidgetButton"),
  darkToggleButton: document.querySelector("#darkToggleButton"),
  searchHistory: document.querySelector("#searchHistory"),
  todayHistorySource: document.querySelector("#todayHistorySource"),
  todayHistoryDomestic: document.querySelector("#todayHistoryDomestic"),
  todayHistoryWorld: document.querySelector("#todayHistoryWorld"),
};

let shortcuts = loadShortcuts();
let widgets = loadWidgets();
let searchHistory = loadSearchHistory();
let searchHistoryRequested = false;
let searchHistoryHideTimer = null;
let selectedCategory = ALL_CATEGORY;
let editingId = null;
let editingWidgetId = null;
let syncEnabled = false;
let isApplyingRemoteData = false;
let syncSaveTimer = null;
let draggedShortcutId = null;
let metadataLookupTimer = null;
let metadataLookupController = null;
let currentShortcutIconUrl = "";

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
  scheduleCloudSave();
}

function loadWidgets() {
  const raw = localStorage.getItem(WIDGET_KEY);
  if (!raw) return defaultWidgets;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultWidgets;
  } catch {
    return defaultWidgets;
  }
}

function saveWidgets() {
  localStorage.setItem(WIDGET_KEY, JSON.stringify(widgets));
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
  if (looksLikeUrl(value)) {
    window.open(normalizeUrl(value), "_self");
    return;
  }

  const engine = searchEngines.find((item) => item.id === elements.engineSelect.value) || searchEngines[0];
  window.open(`${engine.url}${encodeURIComponent(value)}`, "_self");
}

function setSyncStatus(message, tone = "neutral") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.dataset.tone = tone;
}

function getSyncPayload() {
  return {
    shortcuts,
    widgets,
    searchHistory,
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

async function requestSync(method, syncKey, payload = null) {
  const response = await fetch(`/api/sync/${encodeURIComponent(syncKey)}`, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.error === "D1_NOT_CONFIGURED"
        ? "云端数据库还没绑定 D1。"
        : data.error || "同步失败";
    throw new Error(message);
  }
  return data;
}

function applyRemotePayload(payload) {
  if (!payload || !Array.isArray(payload.shortcuts) || !Array.isArray(payload.widgets)) return;

  isApplyingRemoteData = true;
  shortcuts = payload.shortcuts.map((item, index) => normalizeShortcut(item, index)).filter((item) => item.url);
  widgets = payload.widgets;
  searchHistory = Array.isArray(payload.searchHistory)
    ? payload.searchHistory.filter((item) => typeof item === "string" && item.trim()).slice(0, MAX_SEARCH_HISTORY)
    : searchHistory;
  saveShortcuts();
  saveWidgets();
  saveSearchHistory({ sync: false });
  isApplyingRemoteData = false;

  renderShortcutArea();
  renderWidgets();
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
  const syncKey = elements.syncKeyInput.value.trim();
  if (syncKey.length < 4) {
    setSyncStatus("同步码至少需要 4 个字符。", "danger");
    return;
  }

  localStorage.setItem(SYNC_KEY, syncKey);
  syncEnabled = true;
  elements.syncKeyInput.value = syncKey;
  elements.syncEnableButton.textContent = "同步已启用";
  setSyncStatus("正在连接云端数据...", "neutral");

  try {
    const data = await requestSync("GET", syncKey);
    if (data.exists) {
      applyRemotePayload(data.payload);
      setSyncStatus(`已拉取云端数据：${data.updatedAt || "刚刚更新"}`, "ok");
      return;
    }

    if (createIfMissing) {
      await pushCloudData("云端还没有数据，已用本机数据创建。");
    } else {
      setSyncStatus("云端还没有数据，可点击启用同步用本机数据创建。", "neutral");
    }
  } catch (error) {
    syncEnabled = false;
    setSyncStatus(error.message, "danger");
  }
}

function initSync() {
  const savedSyncKey = localStorage.getItem(SYNC_KEY) || "";
  elements.syncKeyInput.value = savedSyncKey;
  if (!savedSyncKey) return;

  syncEnabled = true;
  elements.syncEnableButton.textContent = "同步已启用";
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

function updateClock() {
  const now = new Date();
  const timeText = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateText = now.toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  elements.stageTimeText.textContent = timeText;
  elements.dateText.textContent = dateText;
  elements.stageDateText.textContent = dateText;
}

function setWeatherState({ mark = "?", temp = "等待定位", location = "等待位置", desc = "允许定位后，小新帮你看天气。" }) {
  elements.weatherIcon.textContent = mark;
  elements.weatherTemp.textContent = temp;
  elements.weatherLocation.textContent = location;
  elements.weatherDesc.textContent = desc;
}

function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}

async function resolveWeatherLocation(latitude, longitude) {
  const fallback = `当前位置 ${formatCoordinates(latitude, longitude)}`;

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "zh",
    });
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
    if (!response.ok) throw new Error("location lookup failed");
    const data = await response.json();
    const parts = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean);
    return parts.length ? parts.join(" · ") : fallback;
  } catch {
    return fallback;
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 9000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

async function loadWeather() {
  setWeatherState({ mark: "...", temp: "正在定位", location: "正在获取位置", desc: "小新正在抬头看天空。" });
  elements.weatherRefreshButton.disabled = true;

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    const locationName = await resolveWeatherLocation(latitude, longitude);
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("Weather request failed");

    const data = await response.json();
    const current = data.current;
    const info = weatherCodeMap[current?.weather_code] || { label: "天气已更新", mark: "天" };
    const tempUnit = data.current_units?.temperature_2m || "°C";
    const windUnit = data.current_units?.wind_speed_10m || "km/h";
    const temperature = Math.round(current.temperature_2m);
    const humidity = Math.round(current.relative_humidity_2m);
    const wind = Math.round(current.wind_speed_10m);

    setWeatherState({
      mark: info.mark,
      temp: `${temperature}${tempUnit} · ${info.label}`,
      location: locationName,
      desc: `湿度 ${humidity}% · 风速 ${wind}${windUnit}`,
    });
  } catch {
    setWeatherState({
      mark: "云",
      temp: "天气暂不可用",
      location: "位置暂不可用",
      desc: "请允许定位，或稍后刷新一次。",
    });
  } finally {
    elements.weatherRefreshButton.disabled = false;
  }
}

function renderEngines() {
  elements.engineSelect.innerHTML = "";
  elements.engineButtons.innerHTML = "";
  elements.engineMenu.innerHTML = "";

  const savedEngine = localStorage.getItem(ENGINE_KEY) || searchEngines[0].id;
  searchEngines.forEach((engine) => {
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

    const button = document.createElement("button");
    button.type = "button";
    button.className = `engine-tab engine-${engine.id}`;
    button.dataset.engine = engine.id;
    button.innerHTML = `<span class="engine-mark">${engine.mark}</span><span>${engine.name}</span>`;
    button.addEventListener("click", () => setEngine(engine.id));
    elements.engineButtons.append(button);
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
  const fallback = searchEngines[0].id;
  const nextId = searchEngines.some((engine) => engine.id === engineId) ? engineId : fallback;
  const currentEngine = searchEngines.find((engine) => engine.id === nextId) || searchEngines[0];

  elements.engineSelect.value = nextId;
  elements.engineSelectedMark.textContent = currentEngine.mark;
  elements.engineSelectedName.textContent = currentEngine.name;
  elements.engineSelectButton.className = `engine-select-button engine-${nextId}`;
  document.documentElement.dataset.engine = nextId;
  localStorage.setItem(ENGINE_KEY, nextId);

  elements.engineButtons.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.engine === nextId);
  });

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
  const visibleShortcuts = getVisibleShortcuts();

  elements.shortcutGrid.classList.toggle("is-switching", animate);
  elements.shortcutGrid.innerHTML = "";
  visibleShortcuts.forEach((shortcut, index) => {
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
    node.classList.toggle("is-filtered-in", animate);
    node.style.animationDelay = animate ? `${Math.min(index * 0.025, 0.16)}s` : "";
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

  if (animate) {
    window.setTimeout(() => {
      elements.shortcutGrid.classList.remove("is-switching");
    }, 280);
  }
}

function render() {
  renderCategories();
  renderShortcuts();
  renderWidgets();
}

function renderShortcutArea() {
  renderCategories();
  renderShortcuts();
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
  elements.dialog.showModal();
  elements.urlInput.focus();
}

function closeDialog() {
  metadataLookupController?.abort();
  window.clearTimeout(metadataLookupTimer);
  elements.dialog.close();
  editingId = null;
  currentShortcutIconUrl = "";
  setShortcutMetaStatus("");
  elements.shortcutForm.reset();
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

function getWidgetTypeLabel(type) {
  const labels = {
    note: "便签",
    countdown: "倒计时",
    link: "链接",
  };
  return labels[type] || "组件";
}

function formatWidgetContent(widget) {
  if (widget.type === "countdown") {
    const target = new Date(`${widget.content}T00:00:00`);
    if (Number.isNaN(target.getTime())) return "日期格式示例：2026-12-31";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / 86400000);
    if (diff > 0) return `还有 ${diff} 天`;
    if (diff === 0) return "就是今天";
    return `已过去 ${Math.abs(diff)} 天`;
  }

  if (widget.type === "link") {
    return getHostname(normalizeUrl(widget.content));
  }

  return widget.content;
}

function renderWidgets() {
  elements.widgetGrid.innerHTML = "";
  widgets.forEach((widget, index) => {
    const node = elements.widgetTemplate.content.firstElementChild.cloneNode(true);
    const ribbon = node.querySelector(".widget-ribbon");
    const type = node.querySelector(".widget-type");
    const title = node.querySelector("h3");
    const content = node.querySelector(".widget-content");
    const editButton = node.querySelector(".edit-widget");

    node.style.animationDelay = `${Math.min(index * 0.05, 0.3)}s`;
    ribbon.style.background = widget.color;
    type.textContent = getWidgetTypeLabel(widget.type);
    title.textContent = widget.title;
    content.textContent = formatWidgetContent(widget);
    editButton.addEventListener("click", () => openWidgetDialog(widget.id));

    if (widget.type === "link") {
      node.addEventListener("dblclick", () => {
        window.open(normalizeUrl(widget.content), "_blank", "noreferrer");
      });
    }

    elements.widgetGrid.append(node);
  });
}

function openWidgetDialog(id = null) {
  editingWidgetId = id;
  const widget = widgets.find((item) => item.id === id);

  elements.widgetDialogTitle.textContent = widget ? "编辑小组件" : "添加小组件";
  elements.widgetTitle.value = widget?.title || "";
  elements.widgetType.value = widget?.type || "note";
  elements.widgetContent.value = widget?.content || "";
  elements.widgetColor.value = widget?.color || "#2775d1";
  elements.deleteWidgetButton.hidden = !widget;
  elements.widgetDialog.showModal();
  elements.widgetTitle.focus();
}

function closeWidgetDialog() {
  elements.widgetDialog.close();
  editingWidgetId = null;
  elements.widgetForm.reset();
}

function saveWidgetFromDialog(event) {
  event.preventDefault();
  const data = {
    title: elements.widgetTitle.value.trim(),
    type: elements.widgetType.value,
    content: elements.widgetContent.value.trim(),
    color: elements.widgetColor.value,
  };

  if (editingWidgetId) {
    widgets = widgets.map((widget) => (widget.id === editingWidgetId ? { ...widget, ...data } : widget));
  } else {
    widgets = [{ id: createId(), ...data }, ...widgets];
  }

  saveWidgets();
  closeWidgetDialog();
  renderWidgets();
}

function deleteEditingWidget() {
  if (!editingWidgetId) return;
  const widget = widgets.find((item) => item.id === editingWidgetId);
  const message = widget ? `确定删除「${widget.title}」这个小组件吗？` : "确定删除这个小组件吗？";
  if (!window.confirm(message)) return;
  widgets = widgets.filter((widgetItem) => widgetItem.id !== editingWidgetId);
  saveWidgets();
  closeWidgetDialog();
  renderWidgets();
}

function getTodayHistoryFallback() {
  const now = new Date();
  const key = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return (
    fallbackHistoryEvents[key] || {
      domestic: [{ year: "国内", title: "国内历史资料正在等待在线源更新", detail: "请稍后刷新，系统会继续从国内可访问的数据源获取当天事件。" }],
      world: [{ year: "国际", title: "国际历史资料正在等待在线源更新", detail: "请稍后刷新，系统会继续从国内可访问的数据源获取当天事件。" }],
    }
  );
}

function normalizeHistoryGroup(events, fallback) {
  const list = Array.isArray(events) ? events : [];
  const normalized = list
    .filter((event) => event && typeof event === "object")
    .map((event) => ({
      year: String(event.year || "今日").slice(0, 16),
      title: String(event.title || event.event || "暂无事件").slice(0, 72),
      detail: String(event.detail || event.desc || event.title || "暂无更多介绍。").slice(0, 220),
    }))
    .slice(0, 2);
  return normalized.length ? normalized : fallback;
}

function isDomesticHistoryEvent(event) {
  return /中国|中华|我国|清朝|民国|北京|上海|南京|香港|澳门|台湾|长城|故宫|共产党|抗日|解放军|唐朝|宋朝|元朝|明朝|清廷|北洋|国民政府/.test(
    `${event.title} ${event.detail}`,
  );
}

function groupPublicHistoryEvents(data) {
  const events = Array.isArray(data?.data?.items)
    ? data.data.items
        .map((event) => ({
          year: String(event.year || "今日").slice(0, 16),
          title: String(event.title || "暂无事件").slice(0, 72),
          detail: String(event.description || event.detail || event.title || "暂无更多介绍。").slice(0, 220),
        }))
        .filter((event) => event.title && event.title !== "暂无事件")
    : [];

  if (!events.length) throw new Error("public history unavailable");

  return {
    domestic: events.filter(isDomesticHistoryEvent).slice(0, 2),
    world: events.filter((event) => !isDomesticHistoryEvent(event)).slice(0, 2),
    source: "browser_api",
  };
}

function renderHistoryGroup(container, events, fallback) {
  container.innerHTML = "";
  const items = normalizeHistoryGroup(events, fallback);

  items.forEach((event, index) => {
    const details = document.createElement("details");
    details.className = "history-event";
    details.open = index === 0;

    const summary = document.createElement("summary");
    const year = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("p");

    year.textContent = event.year;
    title.textContent = event.title;
    detail.textContent = event.detail;

    summary.append(year, title);
    details.append(summary, detail);
    container.append(details);
  });
}

function setTodayHistory(data = {}) {
  const fallback = getTodayHistoryFallback();
  renderHistoryGroup(elements.todayHistoryDomestic, data.domestic, fallback.domestic);
  renderHistoryGroup(elements.todayHistoryWorld, data.world, fallback.world);

  const sourceLabels = {
    fallback: "本地精选（在线不可用）",
    domestic_api: "国内可访问 API",
    browser_api: "国内直连 API",
    mixed: "国内 API + 精选",
  };
  elements.todayHistorySource.textContent = sourceLabels[data.source] || data.source || "本地精选";
}

async function loadTodayHistory() {
  const loading = [{ year: "…", title: "正在获取当天事件", detail: "请稍候。" }];
  setTodayHistory({ domestic: loading, world: loading, source: "正在获取" });

  try {
    const response = await fetch("/api/today-history");
    if (!response.ok) throw new Error("history unavailable");
    const data = await response.json();
    if (data.source !== "fallback") {
      setTodayHistory(data);
      return;
    }
  } catch {
    // A static host has no Worker route. Continue with the public CORS-enabled source.
  }

  try {
    const response = await fetch(TODAY_HISTORY_PUBLIC_API, { cache: "no-store" });
    if (!response.ok) throw new Error("public history unavailable");
    setTodayHistory(groupPublicHistoryEvents(await response.json()));
  } catch {
    setTodayHistory({ ...getTodayHistoryFallback(), source: "fallback" });
  }
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
elements.addWidgetButton.addEventListener("click", () => openWidgetDialog());
elements.closeWidgetDialogButton.addEventListener("click", closeWidgetDialog);
elements.cancelWidgetDialogButton.addEventListener("click", closeWidgetDialog);
elements.widgetForm.addEventListener("submit", saveWidgetFromDialog);
elements.deleteWidgetButton.addEventListener("click", deleteEditingWidget);
elements.weatherRefreshButton.addEventListener("click", loadWeather);

updateClock();
setInterval(updateClock, 1000);
initDarkMode();
loadWeather();
loadTodayHistory();
renderEngines();
render();
renderSearchHistory();
initSync();

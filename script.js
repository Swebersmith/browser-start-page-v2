const STORAGE_KEY = "browser-launchpad-shortcuts-v1";
const ENGINE_KEY = "browser-launchpad-engine-v1";
const WIDGET_KEY = "browser-launchpad-widgets-v1";
const SYNC_KEY = "browser-launchpad-sync-key-v1";
const DARK_KEY = "browser-launchpad-dark-v1";
const HISTORY_KEY = "browser-launchpad-history-v1";
const MAX_HISTORY = 20;
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

async function hashSyncKey(text) {
  if (!text) return "";
  const data = new TextEncoder().encode(text.trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

const elements = {
  dateText: document.querySelector("#dateText"),
  stageTimeText: document.querySelector("#stageTimeText"),
  stageDateText: document.querySelector("#stageDateText"),
  weatherIcon: document.querySelector("#weatherIcon"),
  weatherTemp: document.querySelector("#weatherTemp"),
  weatherDesc: document.querySelector("#weatherDesc"),
  weatherRefreshButton: document.querySelector("#weatherRefreshButton"),
  searchZone: document.querySelector(".search-zone"),
  searchForm: document.querySelector("#searchForm"),
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
  heroQuoteText: document.querySelector("#heroQuoteText"),
  heroQuoteSub: document.querySelector("#heroQuoteSub"),
  searchHistory: document.querySelector("#searchHistory"),
  weatherLocation: document.querySelector("#weatherLocation"),
  historyYear: document.querySelector("#historyYear"),
  historyText: document.querySelector("#historyText"),
  historyTooltipText: document.querySelector("#historyTooltipText"),
  historyTooltipLink: document.querySelector("#historyTooltipLink"),
  contextMenu: document.querySelector("#contextMenu"),
};

let shortcuts = loadShortcuts();
let widgets = loadWidgets();
let searchHistoryList = loadSearchHistory();
let selectedCategory = ALL_CATEGORY;
let editingId = null;
let editingWidgetId = null;
let searchQuery = "";
let contextMenuTargetId = null;
let contextMenuTimer = null;
let syncEnabled = false;
let weatherCoords = null;
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
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch { return []; }
}

function addSearchHistory(query) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 80) return;
  searchHistoryList = [trimmed, ...searchHistoryList.filter((i) => i !== trimmed)].slice(0, MAX_HISTORY);
  saveHistoryAndSync();
}

function saveHistoryAndSync() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistoryList));
  scheduleCloudSave();
}

function saveSearchHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistoryList)); }

function renderSearchHistory() {
  elements.searchHistory.innerHTML = "";
  if (!searchHistoryList.length) { elements.searchHistory.hidden = true; return; }
  elements.searchHistory.hidden = false;
  searchHistoryList.forEach((query) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const text = document.createElement("span");
    text.textContent = query;
    text.addEventListener("click", () => {
      elements.searchInput.value = query;
      elements.searchForm.dispatchEvent(new Event("submit", { cancelable: true }));
      elements.searchHistory.hidden = true;
    });
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      searchHistoryList = searchHistoryList.filter((i) => i !== query);
      saveSearchHistory();
      renderSearchHistory();
    });
    row.append(text, removeBtn);
    elements.searchHistory.append(row);
  });
}

function setSyncStatus(message, tone = "neutral") {
  elements.syncStatus.textContent = message;
  elements.syncStatus.dataset.tone = tone;
}

// Daily Shin-chan quotes (deterministic per date)
function getDailyQuote() {
  const quotes = [
    ["\"嗨，美女，你喜欢吃青椒吗？\"", "—— 野原新之助"],
    ["\"我叫野原新之助，今年五岁！\"", "—— 野原新之助"],
    ["\"动感超人！哔哔哔哔——\"", "—— 野原新之助"],
    ["\"小白！棉花糖！\"", "—— 野原新之助"],
    ["\"我要成为大人的话，一定要当一个什么都不用做的大人。\"", "—— 野原新之助"],
    ["\"妈妈，我要看动感超人！\"", "—— 野原新之助"],
    ["\"风间，我们来玩装死游戏吧！\"", "—— 野原新之助"],
    ["\"我的梦想是，吃遍全世界所有的点心！\"", "—— 野原新之助"],
    ["\"小姐，请问你家的WIFI密码是多少？\"", "—— 野原新之助"],
    ["\"如果遇到困难，就跳奇怪的舞解决！\"", "—— 野原新之助"],
    ["\"诶？这不是我的错，是地球的引力太大了。\"", "—— 野原新之助"],
    ["\"妮妮，你的真实玩偶让我也用一下嘛！\"", "—— 野原新之助"],
    ["\"只要有动感超人，一切都会好起来的。\"", "—— 野原新之助"],
    ["\"我可是春日部防卫队队长哦！\"", "—— 野原新之助"],
    ["\"阿呆，你的鼻涕今天也很健康呢！\"", "—— 野原新之助"],
    ["\"人生嘛，开心最重要啦！\"", "—— 野原广志"],
    ["\"就算被嘲笑也没关系，因为笑笑就过去了。\"", "—— 野原新之助"],
    ["\"晚饭吃什么？咖喱？太好了！\"", "—— 野原新之助"],
    ["\"我不想上学，我想在家看电视。\"", "—— 野原新之助"],
    ["\"美冴妈妈生气的时候，整个春日部都会地震。\"", "—— 野原新之助"],
    ["\"正男，不要哭了，我们一起去玩吧！\"", "—— 野原新之助"],
    ["\"这就是传说中的大人世界吗？好无聊啊！\"", "—— 野原新之助"],
    ["\"世界上的女人分为两种：漂亮的和更漂亮的。\"", "—— 野原新之助"],
    ["\"傻气也是才能的一种！\"", "—— 野原新之助"],
    ["\"大人总是在说'等一下'，到底要等到什么时候嘛。\"", "—— 野原新之助"],
    ["\"我的人生信条是：能坐着就不站着，能躺着就不坐着。\"", "—— 野原新之助"],
    ["\"这件衣服好土哦，不过很适合妈妈！\"", "—— 野原新之助"],
    ["\"喜欢一个人不需要理由，就像我喜欢娜娜子姐姐一样。\"", "—— 野原新之助"],
    ["\"如果我是超级英雄，我的必杀技就是'装死'。\"", "—— 野原新之助"],
    ["\"风间，你每天都学那么多东西，头不会爆炸吗？\"", "—— 野原新之助"],
    ["\"我的人生，按我自己的节奏来就好了。\"", "—— 野原新之助"],
    ["\"世界上最重要的就是家人和点心。\"", "—— 野原新之助"],
  ];
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = (seed * 2654435761 >>> 0) % quotes.length;
  return quotes[index];
}

function renderDailyQuote() {
  const [quote, author] = getDailyQuote();
  elements.heroQuoteText.textContent = quote;
  elements.heroQuoteSub.textContent = author;
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=zh`;
    const resp = await fetch(url, { headers: { "User-Agent": "ShinchanLaunchpad/1.0" } });
    if (!resp.ok) return "";
    const data = await resp.json();
    const addr = data.address || {};
    return addr.city || addr.town || addr.county || addr.state || "";
  } catch { return ""; }
}

async function loadTodayInHistory() {
  const now = new Date();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  const todaySeed = now.getFullYear() * 10000 + mm * 100 + dd;

  // Try domestic free API first
  try {
    const resp = await fetch(`https://api.vvhan.com/api/history?type=json`, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data) && data.data.length) {
        const idx = (todaySeed * 1103515245 + 12345 >>> 0) % data.data.length;
        const event = data.data[idx];
        elements.historyYear.textContent = `${event.year || "--"} 年`;
        elements.historyText.textContent = event.title || event.event || "";
        elements.historyTooltipText.textContent = event.desc || event.title || "";
        elements.historyTooltipLink.hidden = true;
        return;
      }
    }
  } catch { /* fallback to local dataset */ }

  // Fallback to local Chinese history dataset
  const candidates = CHINA_HISTORY.filter((e) => e[0] === mm && e[1] === dd);

  if (!candidates.length) {
    elements.historyYear.textContent = "--";
    elements.historyText.textContent = "今天没有特别的历史事件记录。";
    elements.historyTooltipText.textContent = "";
    elements.historyTooltipLink.hidden = true;
    return;
  }

  const idx = (todaySeed * 1103515245 + 12345 >>> 0) % candidates.length;
  const [, , year, text, desc = ""] = candidates[idx];

  elements.historyYear.textContent = `${year} 年`;
  elements.historyText.textContent = text;
  elements.historyTooltipText.textContent = desc || text;
  elements.historyTooltipLink.hidden = true;
}

// Chinese historical events dataset
const CHINA_HISTORY = [
[1,1,1912,"中华民国成立，孙中山就任临时大总统","辛亥革命推翻清朝，结束两千多年封建帝制。"],
[1,8,1976,"周恩来总理逝世","新中国第一任总理周恩来逝世，举国哀悼。"],
[1,15,1935,"遵义会议召开","确立毛泽东在党和红军中的领导地位，是中共历史上生死攸关的转折点。"],
[1,18,1919,"巴黎和会召开","对中国的不公正处理直接引发五四运动。"],
[1,31,1949,"北平和平解放","中国人民解放军进入北平城，千年古都和平解放。"],
[2,1,1662,"郑成功收复台湾","荷兰殖民者投降，台湾重回祖国怀抱。"],
[2,12,1912,"清帝溥仪宣布退位","清朝灭亡，封建帝制正式终结。"],
[2,19,1997,"邓小平逝世","改革开放总设计师邓小平逝世，享年93岁。"],
[2,21,1972,"尼克松访华","美国总统尼克松抵达北京，中美关系正常化迈出关键一步。"],
[3,5,1963,"毛泽东题词'向雷锋同志学习'","雷锋成为全国人民学习的榜样。"],
[3,12,1925,"孙中山逝世","中国民主革命先行者孙中山逝世，留下'革命尚未成功'的遗言。"],
[4,15,1912,"泰坦尼克号沉没","豪华邮轮泰坦尼克号在处女航中撞上冰山沉没。"],
[4,18,1955,"万隆会议召开","周恩来提出'求同存异'方针。"],
[4,24,1970,"东方红一号发射成功","中国第一颗人造卫星发射成功，播放《东方红》乐曲。"],
[5,4,1919,"五四运动爆发","北京学生游行示威反对巴黎和会，成为中国新民主主义革命的开端。"],
[5,12,2008,"汶川发生8.0级特大地震","造成重大人员伤亡和财产损失。"],
[5,23,1951,"西藏和平解放","中央政府与西藏地方政府签署和平解放协议。"],
[6,17,1967,"中国第一颗氢弹爆炸成功","在罗布泊上空成功爆炸，威力330万吨TNT当量。"],
[7,1,1921,"中国共产党成立","中共一大在上海召开，中国共产党正式成立。"],
[7,1,1997,"香港回归祖国","香港特别行政区成立，结束英国殖民统治。"],
[7,7,1937,"卢沟桥事变爆发","日本侵略军进攻卢沟桥，全面抗日战争爆发。"],
[7,13,2001,"北京申奥成功","国际奥委会宣布北京获得2008年夏季奥运会主办权。"],
[7,20,1969,"人类首次登月","阿波罗11号宇航员阿姆斯特朗踏上月球表面。"],
[7,28,1976,"唐山大地震","河北唐山发生7.8级大地震，24万余人遇难。"],
[8,1,1927,"南昌起义","标志着中国共产党独立领导武装斗争的开始。"],
[8,8,2008,"北京奥运会开幕","第29届夏季奥林匹克运动会在北京国家体育场开幕。"],
[8,15,1945,"日本宣布无条件投降","裕仁天皇广播宣布接受波茨坦公告，二战亚洲战场结束。"],
[9,3,1945,"抗日战争胜利纪念日","中国人民抗日战争取得伟大胜利。"],
[9,9,1976,"毛泽东逝世","中共中央主席毛泽东在北京逝世，享年83岁。"],
[9,18,1931,"九一八事变","日本关东军炸毁南满铁路发动侵华战争。"],
[10,1,1949,"中华人民共和国成立","毛泽东在天安门城楼宣布新中国成立。"],
[10,10,1911,"辛亥革命爆发","武昌起义成功，推翻清朝统治。"],
[10,16,1964,"中国第一颗原子弹爆炸成功","成为世界上第五个拥有核武器的国家。"],
[10,25,1971,"中国恢复在联合国合法席位","联大通过2758号决议。"],
[11,7,1917,"俄国十月革命爆发","列宁领导的布尔什维克党建立首个社会主义国家。"],
[11,12,1866,"孙中山诞辰","中国民主革命先驱孙中山在广东香山出生。"],
[12,9,1935,"一二·九运动爆发","北平学生举行抗日救国示威游行。"],
[12,11,2001,"中国正式加入世界贸易组织","WTO多哈会议通过中国入世决定。"],
[12,12,1936,"西安事变","张学良杨虎城发动兵谏，迫使蒋介石停止内战一致抗日。"],
[12,13,1937,"南京大屠杀开始","日军攻陷南京后在六周内屠杀30万中国军民。"],
[12,18,1978,"十一届三中全会召开","揭开了改革开放的序幕。"],
[12,20,1999,"澳门回归祖国","澳门特别行政区成立，结束葡萄牙400多年统治。"],
[12,26,1893,"毛泽东诞辰","毛泽东出生于湖南湘潭韶山冲。"],
];

function getSyncPayload() {
  return {
    shortcuts,
    widgets,
    searchHistory: searchHistoryList,
  };
}

async function requestSync(method, syncKey, payload = null) {
  const hashedKey = await hashSyncKey(syncKey);
  const response = await fetch(`/api/sync/${encodeURIComponent(hashedKey)}`, {
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
  if (!payload || !Array.isArray(payload.shortcuts)) return;

  isApplyingRemoteData = true;
  shortcuts = payload.shortcuts.map((item, index) => normalizeShortcut(item, index)).filter((item) => item.url);
  widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
  if (Array.isArray(payload.searchHistory)) {
    searchHistoryList = payload.searchHistory.filter((i) => typeof i === "string").slice(0, MAX_HISTORY);
  }
  saveShortcuts();
  saveWidgets();
  saveSearchHistory();
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
  pullCloudData().catch(() => undefined);
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

  if (searchQuery) {
    const lower = searchQuery.toLowerCase();
    const filtered = visible.filter((item) =>
      (item.name || "").toLowerCase().includes(lower) ||
      (item.url || "").toLowerCase().includes(lower)
    );
    return getSortedShortcuts(filtered);
  }

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

function setWeatherState({ mark = "?", temp = "等待定位", desc = "允许定位后，小新帮你看天气。" }) {
  elements.weatherIcon.textContent = mark;
  elements.weatherTemp.textContent = temp;
  elements.weatherDesc.textContent = desc;
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
  setWeatherState({ mark: "...", temp: "正在定位", desc: "小新正在抬头看天空。" });
  elements.weatherRefreshButton.disabled = true;

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    weatherCoords = { lat: latitude, lon: longitude };
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
      desc: `湿度 ${humidity}% · 风速 ${wind}${windUnit}`,
    });

    if (weatherCoords) {
      const location = await reverseGeocode(weatherCoords.lat, weatherCoords.lon);
      if (location) elements.weatherLocation.textContent = `📍 ${location}`;
    }
  } catch {
    setWeatherState({
      mark: "云",
      temp: "天气暂不可用",
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

function filterShortcutsBySearch(value) {
  searchQuery = value.trim();
  elements.searchHistory.hidden = !(!searchQuery && searchHistoryList.length && document.activeElement === elements.searchInput);
  renderCategories();
  renderShortcuts({ animate: searchQuery.length > 0 });
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

function submitSearch(event) {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query) return;

  if (looksLikeUrl(query)) {
    window.open(normalizeUrl(query), "_self");
    return;
  }

  const engine = searchEngines.find((item) => item.id === elements.engineSelect.value) || searchEngines[0];
  addSearchHistory(query);
  renderSearchHistory();
  window.open(`${engine.url}${encodeURIComponent(query)}`, "_self");
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

function initDarkMode() {
  const saved = localStorage.getItem(DARK_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = saved !== null ? saved === "1" : prefersDark;
  if (dark) document.documentElement.dataset.theme = "dark";
  updateDarkToggle();
}

function toggleDarkMode() {
  const isDark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "" : "dark";
  localStorage.setItem(DARK_KEY, document.documentElement.dataset.theme === "dark" ? "1" : "0");
  updateDarkToggle();
}

function updateDarkToggle() {
  const isDark = document.documentElement.dataset.theme === "dark";
  elements.darkToggleButton.textContent = isDark ? "明" : "暗";
}

function showContextMenu(event) {
  const card = event.target.closest(".shortcut-card");
  if (!card || !card.dataset.shortcutId) return;
  event.preventDefault();
  contextMenuTargetId = card.dataset.shortcutId;
  const shortcut = shortcuts.find((item) => item.id === contextMenuTargetId);
  if (!shortcut) return;
  const pinBtn = elements.contextMenu.querySelector('[data-action="pin"]');
  pinBtn.textContent = shortcut.pinned ? "取消置顶" : "置顶";
  elements.contextMenu.hidden = false;
  elements.contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 210)}px`;
  elements.contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 210)}px`;
  window.clearTimeout(contextMenuTimer);
}

function hideContextMenu() {
  contextMenuTimer = window.setTimeout(() => {
    elements.contextMenu.hidden = true;
    contextMenuTargetId = null;
  }, 80);
}

function handleContextMenuAction(action) {
  const id = contextMenuTargetId;
  hideContextMenu();
  if (!id) return;
  const shortcut = shortcuts.find((item) => item.id === id);
  if (!shortcut) return;
  switch (action) {
    case "open": window.open(shortcut.url, "_blank", "noreferrer"); break;
    case "edit": openDialog(id); break;
    case "pin": toggleShortcutPin(id); break;
    case "delete":
      if (window.confirm(`确定删除「${shortcut.name}」这个快捷方式吗？`)) {
        shortcuts = shortcuts.filter((item) => item.id !== id);
        saveShortcuts();
        renderShortcutArea();
      }
      break;
  }
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
elements.darkToggleButton.addEventListener("click", toggleDarkMode);
elements.searchInput.addEventListener("focus", () => {
  if (!searchQuery) {
    renderSearchHistory();
    elements.searchHistory.hidden = !searchHistoryList.length;
  }
});
elements.searchInput.addEventListener("blur", () => {
  window.setTimeout(() => { elements.searchHistory.hidden = true; }, 180);
});
elements.searchInput.addEventListener("input", () => filterShortcutsBySearch(elements.searchInput.value));

elements.contextMenu.addEventListener("click", (event) => {
  const action = event.target.closest("button")?.dataset.action;
  if (action) handleContextMenuAction(action);
});

elements.shortcutGrid.addEventListener("contextmenu", showContextMenu);
document.addEventListener("click", (event) => {
  if (!elements.contextMenu.contains(event.target) && !elements.contextMenu.hidden) hideContextMenu();
});
document.addEventListener("scroll", () => { if (!elements.contextMenu.hidden) hideContextMenu(); });

updateClock();
setInterval(updateClock, 1000);
loadWeather();
renderEngines();
render();
initDarkMode();
renderDailyQuote();
loadTodayInHistory();
initSync();

// Mobile tap handler for history card
const historyCard = document.querySelector(".history-card");
if (historyCard) {
  historyCard.addEventListener("click", () => historyCard.classList.toggle("is-tapped"));
}

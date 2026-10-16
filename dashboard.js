const $ = id => document.getElementById(id);
const WEATHER_CACHE = "launchpad-weather-v2", WEATHER_PLACE = "launchpad-weather-place-v2", HISTORY_CACHE = "launchpad-history-v2";
const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ } };
const text = (tag, value, className = "") => { const node = document.createElement(tag); node.textContent = value; node.className = className; return node; };
const number = (value, unit = "") => Number.isFinite(value) ? `${Math.round(value)}${unit}` : "--";
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const weatherInfo = code => {
  if (code === 0) return ["晴", "晴朗"];
  if (code <= 3) return ["云", code === 3 ? "阴天" : "多云"];
  if (code === 45 || code === 48) return ["雾", "有雾"];
  if (code >= 95) return ["雷", "雷雨"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["雪", "降雪"];
  if ([56, 57, 66, 67].includes(code)) return ["冰", "冻雨"];
  if (code >= 51 && code <= 82) return ["雨", "降雨"];
  return ["天", "天气"];
};

async function jsonRequest(url, { signal, timeout = 10000 } = {}) {
  const controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "暂时无法获取数据");
    return data;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

export function initDashboard({ openSurface }) {
  let weather = null, weatherPlace = read(WEATHER_PLACE), weatherRun = 0, weatherController;
  let history = null, historyLoading = false, searchController;
  let historyDay = localDate();
  const detailControllers = new Set(), detailCache = new Map();

  function renderWeather(data, place, stale = false) {
    weather = data;
    const current = data.current, info = weatherInfo(current.weather_code);
    $("weatherIcon").textContent = info[0];
    $("weatherTemp").textContent = `${number(current.temperature_2m, "°C")} · ${info[1]}`;
    $("weatherLocation").textContent = place.name;
    $("weatherFeels").textContent = number(current.apparent_temperature, "°C");
    $("weatherHumidity").textContent = number(current.relative_humidity_2m, "%");
    $("weatherWind").textContent = number(current.wind_speed_10m, "m/s");
    $("weatherPanel").classList.remove("is-loading");
    $("weatherPanel").querySelector(".weather-kicker").textContent = stale ? "缓存天气" : "当前天气";
    $("weatherStatus").textContent = `${place.name} · ${stale ? "上次缓存，正在尝试更新 · " : ""}${current.time.replace("T", " ")}（${data.timezone}）`;
    const body = $("weatherDetailBody");
    body.replaceChildren();
    const overview = text("section", "", "weather-detail-overview");
    overview.append(text("strong", `${number(current.temperature_2m, "°C")} ${info[1]}`), text("p", `体感 ${number(current.apparent_temperature, "°C")} · 湿度 ${number(current.relative_humidity_2m, "%")} · 风速 ${number(current.wind_speed_10m, "m/s")}`), text("p", `降水 ${number(current.precipitation, " mm")} · 气压 ${number(current.pressure_msl, " hPa")} · 云量 ${number(current.cloud_cover, "%")}`));
    body.append(overview, text("h3", "未来 7 天天气"));
    const grid = text("div", "", "forecast-grid");
    data.daily.time.slice(0, 7).forEach((date, index) => {
      const daily = data.daily, info = weatherInfo(daily.weather_code?.[index]);
      const card = text("article", "", "forecast-day");
      const label = index === 0 ? "今天" : index === 1 ? "明天" : new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
      card.append(text("strong", label), text("small", date.slice(5).replace("-", "/")), text("span", info[0], "forecast-icon"), text("span", info[1]), text("strong", `${number(daily.temperature_2m_min[index])}° / ${number(daily.temperature_2m_max[index])}°`), text("small", `降水 ${number(daily.precipitation_probability_max?.[index], "%")}`), text("small", `风 ${number(daily.wind_speed_10m_max?.[index], "m/s")}`));
      grid.append(card);
    });
    body.append(grid);
    if (data.daily.sunrise?.[0]) body.append(text("p", `今日日出 ${data.daily.sunrise[0].slice(11, 16)} · 日落 ${data.daily.sunset[0].slice(11, 16)}（当地时间）`, "field-hint"));
    if (data.hourly?.time?.length) {
      body.append(text("h3", "未来 24 小时（当地时间）"));
      const strip = text("div", "", "hourly-strip");
      strip.tabIndex = 0; strip.setAttribute("aria-label", "逐小时天气，可左右滚动");
      data.hourly.time.slice(0, 24).forEach((time, index) => {
        const item = text("div", "", "hourly-item");
        item.append(text("small", time.slice(11, 16)), text("strong", number(data.hourly.temperature_2m[index], "°")), text("small", `雨 ${number(data.hourly.precipitation_probability?.[index], "%")}`));
        strip.append(item);
      });
      body.append(strip);
    }
  }

  function getPosition() {
    return new Promise((resolve, reject) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000, maximumAge: 600000, enableHighAccuracy: false }) : reject(new Error("No location")));
  }

  async function loadWeather({ place, locate = false } = {}) {
    const run = ++weatherRun;
    weatherController?.abort(); weatherController = new AbortController();
    $("weatherRefreshButton").disabled = true;
    $("weatherStatus").textContent = locate || (!place && !weatherPlace) ? "正在定位，也可以直接搜索城市。" : "正在更新天气…";
    try {
      let selected = place || (!locate && weatherPlace);
      if (!selected) {
        const position = await getPosition();
        selected = { latitude: position.coords.latitude, longitude: position.coords.longitude, name: "当前位置" };
      }
      if (run !== weatherRun) return;
      const params = new URLSearchParams({ latitude: selected.latitude.toFixed(2), longitude: selected.longitude.toFixed(2) });
      const data = await jsonRequest(`/api/weather?${params}`, { signal: weatherController.signal });
      if (run !== weatherRun) return;
      weatherPlace = selected;
      store(WEATHER_PLACE, selected); store(WEATHER_CACHE, { data, place: selected, savedAt: Date.now() });
      renderWeather(data, selected);
    } catch {
      if (run !== weatherRun) return;
      $("weatherPanel").classList.remove("is-loading");
      $("weatherStatus").textContent = weather ? "更新暂未成功，正在展示缓存，请留意资料时间。可重试或切换城市。" : "定位或天气暂不可用。搜索并选择城市，无需开启定位。";
      if (!weather) { $("weatherTemp").textContent = "选择城市查看天气"; $("weatherLocation").textContent = "点击查看详情"; }
      else $("weatherPanel").querySelector(".weather-kicker").textContent = "缓存天气";
    } finally { if (run === weatherRun) $("weatherRefreshButton").disabled = false; }
  }

  function openWeather(source) { openSurface($("weatherDialog"), source); }
  $("weatherPanel").addEventListener("click", event => { if (!event.target.closest("button")) openWeather($("weatherPanel")); });
  $("weatherOpenButton").addEventListener("click", () => openWeather($("weatherPanel")));
  $("weatherRefreshButton").addEventListener("click", () => loadWeather());
  $("weatherLocateButton").addEventListener("click", () => loadWeather({ locate: true }));
  $("weatherCityForm").addEventListener("submit", async event => {
    event.preventDefault();
    searchController?.abort(); const controller = new AbortController(); searchController = controller;
    $("weatherCitySearchButton").disabled = true;
    $("weatherCityResults").replaceChildren(text("p", "正在查找城市…", "field-hint"));
    try {
      const data = await jsonRequest(`/api/weather/cities?q=${encodeURIComponent($("weatherCityInput").value.trim())}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      $("weatherCityResults").replaceChildren();
      data.results.forEach(place => {
        const name = [...new Set([place.name, place.region, place.country].filter(Boolean))].join(" · ");
        const button = text("button", name); button.type = "button";
        button.addEventListener("click", () => { $("weatherCityResults").replaceChildren(); loadWeather({ place: { ...place, name } }); });
        $("weatherCityResults").append(button);
      });
      if (!data.results.length) $("weatherCityResults").append(text("p", "没有找到城市，试试中文全名或英文名称。", "field-hint"));
    } catch { if (!controller.signal.aborted) $("weatherCityResults").replaceChildren(text("p", "城市搜索暂不可用，请重试。", "field-hint")); }
    finally { if (searchController === controller) $("weatherCitySearchButton").disabled = false; }
  });

  function renderHistoryCards() {
    for (const [group, id] of [["domestic", "todayHistoryDomestic"], ["world", "todayHistoryWorld"]]) {
      const container = $(id); container.replaceChildren();
      (history?.[group] || []).slice(0, 2).forEach(item => {
        const button = text("button", "", "history-event-button"); button.type = "button";
        button.append(text("span", item.year), text("strong", item.title), text("span", "↗"));
        button.addEventListener("click", () => openHistory(button, item));
        container.append(button);
      });
      if (!container.children.length) container.append(text("p", historyLoading ? "正在获取当天资料…" : history ? "这次资料中暂无此类事件。" : "暂未获取到当天资料，点击标题重试。", "field-hint"));
    }
    $("historyPanel").classList.remove("is-loading");
  }

  async function moreHistory(item, article, button) {
    if (!item.url) return;
    button.disabled = true; button.textContent = "正在读取介绍…";
    const controller = new AbortController(); detailControllers.add(controller);
    try {
      const data = detailCache.get(item.url) || await jsonRequest(`/api/history-detail?${new URLSearchParams({ url: item.url })}`, { signal: controller.signal, timeout: 7000 });
      detailCache.set(item.url, data);
      if (!article.isConnected || controller.signal.aborted) return;
      article.append(text("h4", `相关词条：${data.title}`), text("p", data.detail));
      button.remove();
    } catch {
      if (!controller.signal.aborted) { button.textContent = "补充介绍暂不可用，点此重试"; button.disabled = false; }
    } finally { detailControllers.delete(controller); }
  }

  function renderHistoryDetails(selected) {
    const list = $("historyDetailList"); list.replaceChildren();
    let selectedArticle, selectedButton;
    for (const [key, label] of [["domestic", "国内事件"], ["world", "国际事件"]]) {
      if (!history?.[key]?.length) continue;
      list.append(text("h3", label));
      history[key].forEach(item => {
        const article = text("article", "", "history-detail-event");
        article.append(text("small", `${history.date} · ${item.year} 年`), text("h3", item.title), text("p", item.detail || "该来源暂无事件摘要。"));
        if (item.url) {
          const footer = text("div", "", "detail-toolbar"), button = text("button", "补充介绍"); button.type = "button";
          button.addEventListener("click", () => moreHistory(item, article, button));
          const link = text("a", "阅读来源 ↗"); link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
          footer.append(button, link); article.append(footer);
          if (selected === item) selectedButton = button;
        }
        if (selected === item) { article.classList.add("is-selected"); selectedArticle = article; }
        list.append(article);
      });
    }
    if (selectedArticle) {
      selectedArticle.scrollIntoView({ block: "nearest", behavior: "instant" });
      if (selectedButton) moreHistory(selected, selectedArticle, selectedButton);
    }
  }

  function openHistory(source, selected) {
    renderHistoryDetails(selected);
    openSurface($("historyDialog"), source);
    $("historyDetailList").querySelector(".is-selected")?.scrollIntoView({ block: "nearest", behavior: "instant" });
    if (!history && !historyLoading) loadHistory();
  }

  async function loadHistory() {
    if (historyLoading) return;
    historyLoading = true;
    const date = localDate();
    historyDay = date;
    if (history?.date !== date) history = null;
    $("todayHistorySource").textContent = "正在更新";
    $("historyDetailStatus").textContent = `${date} · 正在更新资料…`;
    $("historyRefreshButton").disabled = true;
    renderHistoryCards();
    try {
      const data = await jsonRequest(`/api/today-history?date=${date}`, { timeout: 9000 });
      if (data.date !== date || !(data.domestic?.length || data.world?.length)) throw new Error("Wrong date or empty history");
      history = data; store(HISTORY_CACHE, data);
      $("todayHistorySource").textContent = data.stale ? "缓存资料" : "查看详情";
      $("historyDetailStatus").textContent = `${date} · ${data.source}${data.stale ? " · 在线源暂不可用，展示同日缓存" : ""}`;
    } catch {
      $("todayHistorySource").textContent = history ? "本机缓存" : "点击重试";
      $("historyDetailStatus").textContent = history ? `${date} · 在线源暂不可用，展示本机同日缓存。` : `${date} · 暂未获取到当天资料，请稍后重试。`;
    } finally {
      historyLoading = false; $("historyRefreshButton").disabled = false;
      renderHistoryCards(); if ($("historyDialog").open) renderHistoryDetails();
    }
  }
  $("historyOpenButton").addEventListener("click", () => openHistory($("historyPanel")));
  $("historyPanel").addEventListener("click", event => { if (!event.target.closest("button")) openHistory($("historyPanel")); });
  $("historyRefreshButton").addEventListener("click", loadHistory);
  $("historyDialog").addEventListener("close", () => { detailControllers.forEach(controller => controller.abort()); detailControllers.clear(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && history?.date !== localDate()) loadHistory(); });
  window.addEventListener("online", () => { loadHistory(); if (weatherPlace) loadWeather(); });
  window.setInterval(() => { if (!document.hidden && historyDay !== localDate()) loadHistory(); }, 60000);
  const cachedWeather = read(WEATHER_CACHE), cachedHistory = read(HISTORY_CACHE);
  if (cachedWeather && Date.now() - cachedWeather.savedAt < 24 * 3600000) renderWeather(cachedWeather.data, cachedWeather.place, true);
  if (cachedHistory?.date === localDate()) { history = cachedHistory; renderHistoryCards(); }
  loadWeather(); loadHistory();
}

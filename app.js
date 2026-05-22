const app = document.querySelector("#app");
const page = document.body.dataset.page || "dashboard";

const RSS_BY_NAME = {
  "Dan Koe": "https://letters.thedankoe.com/feed",
  "Naval": "https://nav.al/feed",
  "Naval Ravikant": "https://nav.al/feed",
  "Sahil Bloom": "https://sahilbloom.substack.com/feed",
  "Ali Abdaal": "https://aliabdaal.com/feed/",
  "Justin Welsh": "无（仅邮件订阅）",
  "Simon Willison": "https://simonwillison.net/atom/everything/",
  "Eugene Yan": "https://eugeneyan.com/rss/",
  "Andrej Karpathy": "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ",
  "Harrison Chase": "https://blog.langchain.dev/feed/",
  "Yohei Nakajima": "https://yoheinakajima.com/feed/",
  "Jerry Liu": "https://www.llamaindex.ai/blog/feed.xml"
};

const state = { data: null, query: "", thinkerLevel: "all" };

init();

async function init() {
  setActiveNav();
  try {
    const [dashboard, manifest, daily, weekly, topics, thinkers] = await Promise.all([
      loadJson("./data/dashboard.json"),
      loadJson("./data/manifest.json"),
      loadJson("./data/daily.json"),
      loadJson("./data/weekly.json"),
      loadJson("./data/topics.json"),
      loadJson("./data/thinkers.json")
    ]);
    state.data = { dashboard, manifest, daily, weekly, topics, thinkers };
    updateSyncTime(manifest.generatedAt || dashboard.generatedAt);
    if (page === "dashboard") renderDashboard();
    if (page === "daily") renderDaily();
    if (page === "weekly") renderWeekly();
    if (page === "thinkers") renderThinkers();
  } catch (error) {
    app.innerHTML = `<div class="error-state">数据加载失败。请先在项目根目录运行 <code>node sync-data.mjs</code>，再刷新页面。<br>${escapeHtml(error.message)}</div>`;
  }
}

async function loadJson(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

function setActiveNav() {
  document.querySelectorAll("[data-nav]").forEach((item) => item.classList.toggle("is-active", item.dataset.nav === page));
}

function updateSyncTime(value) {
  const node = document.querySelector("#nav-sync-time");
  if (node) node.textContent = formatDateTime(value);
}

function renderDashboard() {
  const { dashboard, daily, weekly, topics, thinkers } = state.data;
  const latestDaily = dashboard.latestDaily || daily[0];
  const latestWeekly = dashboard.latestWeekly || weekly[0];
  const latestTopic = dashboard.latestTopic || topics[0];
  const recentTags = recentTagCloud(daily);

  app.innerHTML = `
    <section class="metric-grid" aria-label="数据概览">
      ${metric("日报", dashboard.stats?.daily ?? daily.length, "份")}
      ${metric("周报", dashboard.stats?.weekly ?? weekly.length, "份")}
      ${metric("思想者", dashboard.stats?.thinkers ?? thinkers.length, "位")}
      ${metric("趋势标签", recentTags.length, "个")}
    </section>
    <section class="dashboard-grid">
      ${latestDaily ? renderDailyFeature(latestDaily) : emptyCard("暂无日报")}
      ${latestWeekly ? renderWeeklyFeature(latestWeekly) : emptyCard("暂无周报")}
    </section>
    <section class="dashboard-grid">
      <article class="feature-card"><p class="card-kicker">🏷 最近话题趋势</p><div class="tag-cloud">${recentTags.map(tagCloudItem).join("")}</div></article>
      <article class="feature-card"><p class="card-kicker">🔍 最新专题观察</p>${latestTopic ? `<h2 class="card-title">${escapeHtml(latestTopic.title)}</h2><p class="summary-text">${escapeHtml(latestTopic.excerpt || "暂无摘要")}</p><div class="card-meta">${tag(latestTopic.week || "专题")}${tag(`${latestTopic.insights?.length || latestTopic.sections?.length || 0} 条洞察`)}</div>` : `<p class="summary-text">暂无专题报告</p>`}</article>
    </section>
    <section class="feature-card"><p class="card-kicker">🧠 最近活跃思想者</p><ul class="compact-list">${(dashboard.activeThinkers || thinkers.slice(0, 5)).map((thinker) => `<li><strong>${escapeHtml(thinker.emoji || "🧠")} ${escapeHtml(thinker.name)}</strong><small>${escapeHtml(thinker.role || "思想者")} · 活跃度 ${escapeHtml(thinker.activityScore ?? 0)}</small></li>`).join("")}</ul></section>
  `;
}

function renderDailyFeature(report) {
  return `<article class="feature-card is-daily"><p class="card-kicker">🔥 最新日报 · ${escapeHtml(report.date)}</p><h2 class="card-title">${escapeHtml(report.title)}</h2><div class="card-meta">${tag(`${report.highlights?.length || 0} 个亮点`)}${(report.tags || []).slice(0, 4).map(tag).join("")}</div><p class="summary-text">${escapeHtml(report.excerpt || "暂无摘要")}</p><ul class="compact-list">${(report.highlights || []).slice(0, 3).map((item) => `<li><strong>${linkOrText(item.title, item.url)}</strong><small>${escapeHtml(item.heat || item.summary || "热点讨论")}</small></li>`).join("")}</ul></article>`;
}

function renderWeeklyFeature(report) {
  const people = unique((report.entries || []).map((entry) => entry.person).filter(Boolean));
  return `<article class="feature-card is-weekly"><p class="card-kicker">🧭 最新周报 · ${escapeHtml(report.week)}</p><h2 class="card-title">${escapeHtml(report.title)}</h2><div class="card-meta">${tag(`${people.length} 位思想者`)}${people.slice(0, 4).map(tag).join("")}</div><p class="summary-text">${escapeHtml(report.excerpt || "暂无摘要")}</p><ul class="compact-list">${(report.entries || []).slice(0, 4).map((item) => `<li><strong>${escapeHtml(item.person || "观点")} · ${escapeHtml(item.title || "更新")}</strong><small>${escapeHtml(item.excerpt || item.date || "")}</small></li>`).join("")}</ul></article>`;
}

function renderDaily() {
  state.query = "";
  app.innerHTML = `${toolbar("搜索日期、标签、标题", "daily-search")}<div class="report-list" id="daily-list"></div>`;
  document.querySelector("#daily-search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); drawDailyList(); });
  drawDailyList();
}

function drawDailyList() {
  const list = document.querySelector("#daily-list");
  const reports = filterByQuery(state.data.daily, ["date", "title", "excerpt", "tagsText"]);
  list.innerHTML = reports.length ? reports.map((report, index) => `<article class="report-card"><details ${index === 0 ? "open" : ""}><summary><div class="report-heading"><h2>${escapeHtml(report.date)} · ${escapeHtml(report.title)}</h2><p>${escapeHtml(report.excerpt || "暂无摘要")}</p><div class="card-meta">${tag(`${report.highlights?.length || report.stats?.topicCount || 0} 个亮点`)}${(report.tags || []).slice(0, 5).map(tag).join("")}</div></div></summary><div class="report-body"><div class="detail-grid"><div class="detail-item"><span>最高热度</span><strong>${escapeHtml(report.stats?.maxScore || "未知")}</strong></div><div class="detail-item"><span>源文件</span><strong>${escapeHtml(shortPath(report.sourcePath))}</strong></div></div><div class="markdown-body">${report.html}</div></div></details></article>`).join("") : `<div class="empty-state">没有匹配的日报。</div>`;
}

function renderWeekly() {
  state.query = "";
  app.innerHTML = `${toolbar("搜索周次、思想者、核心观点", "weekly-search")}<div class="report-list" id="weekly-list"></div>`;
  document.querySelector("#weekly-search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); drawWeeklyList(); });
  drawWeeklyList();
}

function drawWeeklyList() {
  const list = document.querySelector("#weekly-list");
  const reports = filterByQuery(state.data.weekly, ["week", "title", "excerpt", "tagsText", "entriesText"]);
  list.innerHTML = reports.length ? reports.map((report, index) => {
    const people = unique((report.entries || []).map((entry) => entry.person).filter(Boolean));
    return `<article class="report-card"><details ${index === 0 ? "open" : ""}><summary><div class="report-heading"><h2>${escapeHtml(report.week)} · ${escapeHtml(report.title)}</h2><p>${escapeHtml(report.excerpt || "暂无摘要")}</p><div class="card-meta">${tag(`${report.entries?.length || 0} 条观点`)}${people.slice(0, 6).map(tag).join("")}</div></div></summary><div class="report-body"><div class="detail-grid"><div class="detail-item"><span>追踪对象</span><strong>${escapeHtml(people.join("、") || "未提取")}</strong></div><div class="detail-item"><span>源文件</span><strong>${escapeHtml(shortPath(report.sourcePath))}</strong></div></div><ul class="compact-list">${(report.entries || []).slice(0, 8).map((item) => `<li><strong>${escapeHtml(item.person || "观点")} · ${escapeHtml(item.title || "更新")}</strong><small>${escapeHtml(item.date || "")} ${item.url ? ` · ${linkOrText("原文", item.url)}` : ""}</small></li>`).join("")}</ul><div class="markdown-body">${report.html}</div></div></details></article>`;
  }).join("") : `<div class="empty-state">没有匹配的周报。</div>`;
}

function renderThinkers() {
  state.query = "";
  state.thinkerLevel = "all";
  app.innerHTML = `<div class="toolbar"><input id="thinker-search" class="search-input" type="search" placeholder="搜索名字、领域、RSS" autocomplete="off"><div class="segmented" role="tablist" aria-label="思想者级别"><button type="button" data-level="all" class="is-active">全部</button><button type="button" data-level="active">活跃</button><button type="button" data-level="agent">Agent</button></div></div><div class="thinker-grid" id="thinker-grid"></div>`;
  document.querySelector("#thinker-search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); drawThinkers(); });
  document.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => { state.thinkerLevel = button.dataset.level; document.querySelectorAll("[data-level]").forEach((item) => item.classList.toggle("is-active", item === button)); drawThinkers(); }));
  drawThinkers();
}

function drawThinkers() {
  const grid = document.querySelector("#thinker-grid");
  const query = state.query;
  const filtered = state.data.thinkers.filter((thinker) => {
    const rss = rssFor(thinker);
    const text = [thinker.name, thinker.role, thinker.signal, rss, ...(thinker.focus || [])].join(" ").toLowerCase();
    const modeOk = state.thinkerLevel === "all" || (state.thinkerLevel === "active" && thinker.activityScore > 0) || (state.thinkerLevel === "agent" && /agent|rag|llm|ai/i.test(text));
    return modeOk && (!query || text.includes(query));
  });
  grid.innerHTML = filtered.length ? filtered.map((thinker) => {
    const rss = rssFor(thinker);
    const latest = latestUpdate(thinker);
    return `<article class="thinker-card"><div class="thinker-top"><h2>${escapeHtml(thinker.emoji || "🧠")} ${escapeHtml(thinker.name)}</h2><span class="level-chip">${escapeHtml(thinker.activityScore > 2 ? "活跃" : "关注")}</span></div><p>${escapeHtml(thinker.role || thinker.signal || "领域待补充")}</p><div class="field-stack"><span>RSS</span>${rss && !rss.startsWith("无") ? `<a class="rss-link" href="${escapeAttr(rss)}" target="_blank" rel="noreferrer">${escapeHtml(rss)}</a>` : `<strong>${escapeHtml(rss || "待补充")}</strong>`}</div><div class="field-stack"><span>最近更新时间</span><strong>${escapeHtml(latest)}</strong></div><div class="tag-row">${(thinker.focus || []).slice(0, 5).map(tag).join("")}</div></article>`;
  }).join("") : `<div class="empty-state">没有匹配的思想者。</div>`;
}

function metric(label, value, unit) { return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? 0))}<small>${escapeHtml(unit)}</small></strong></article>`; }
function toolbar(placeholder, id) { return `<div class="toolbar"><input id="${id}" class="search-input" type="search" placeholder="${placeholder}" autocomplete="off"><span class="status-pill"><span class="pulse"></span> 倒序排列</span></div>`; }
function tag(value) { return value ? `<span class="tag">${escapeHtml(String(value))}</span>` : ""; }
function tagCloudItem(item) { const size = Math.min(1.55, item.weight || 0.92 + (item.count || 0) * 0.05); return `<span class="tag" style="font-size:${size}rem">${escapeHtml(item.tag || item.name)} · ${escapeHtml(item.count || 0)}</span>`; }
function recentTagCloud(reports) { const counts = new Map(); for (const report of reports.slice(0, 7)) { for (const value of report.tags || []) counts.set(value, (counts.get(value) || 0) + 1); for (const item of report.highlights || []) { const text = `${item.title || ""} ${item.summary || ""}`; if (/AI|Agent|LLM|Claude|GPT/i.test(text)) counts.set("AI/Agent", (counts.get("AI/Agent") || 0) + 1); if (/安全|漏洞|Linux|privacy|security/i.test(text)) counts.set("安全", (counts.get("安全") || 0) + 1); if (/Rust|Go|Mojo|编程|工具/i.test(text)) counts.set("编程工具", (counts.get("编程工具") || 0) + 1); } } const max = Math.max(...counts.values(), 1); return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([tag, count]) => ({ tag, count, weight: Number((0.85 + count / max * 0.7).toFixed(2)) })); }
function emptyCard(text) { return `<article class="feature-card"><p class="summary-text">${escapeHtml(text)}</p></article>`; }
function filterByQuery(items, fields) { const query = state.query; if (!query) return items; return items.filter((item) => { const extras = { tagsText: (item.tags || []).join(" "), entriesText: (item.entries || []).map((entry) => `${entry.person} ${entry.title} ${entry.excerpt}`).join(" ") }; return fields.some((field) => String(item[field] ?? extras[field] ?? "").toLowerCase().includes(query)); }); }
function linkOrText(text, href) { return href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeHtml(text || href)}</a>` : escapeHtml(text || ""); }
function rssFor(thinker) { return RSS_BY_NAME[thinker.name] || RSS_BY_NAME[(thinker.aliases || [])[0]] || (thinker.links || []).find((link) => /rss|feed|atom/i.test(link.url || link.label || ""))?.url || "待补充"; }
function latestUpdate(thinker) { const profileDate = `${thinker.sourceProfile?.title || ""} ${thinker.sourceProfile?.excerpt || ""}`.match(/\d{4}-\d{2}-\d{2}/)?.[0]; return thinker.recentUpdates?.[0]?.date || thinker.candidateDate || profileDate || "待更新"; }
function shortPath(filePath) { return String(filePath || "").replace(/^.*workspace-oc_[^/]+\//, ""); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function formatDateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || "未知") : date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttr(value) { return escapeHtml(value).replaceAll("`", "&#096;"); }

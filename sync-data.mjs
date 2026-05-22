import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(SITE_ROOT, "data");
const REPORT_ROOT =
  process.env.REPORT_ROOT ||
  "WORKSPACE_DIR/reports";
const CANDIDATES_ROOT =
  process.env.CANDIDATES_ROOT ||
  "WORKSPACE_DIR/candidates";

const thinkerSeeds = [
  {
    name: "Dan Koe",
    slug: "dan-koe",
    emoji: "🧭",
    role: "创作者商业与个人系统",
    focus: ["个人垄断", "写作系统", "一人公司"],
    signal: "关注个体如何用内容、产品和系统化学习构建长期复利。",
    links: [{ label: "Website", url: "https://thedankoe.com/" }],
  },
  {
    name: "Naval",
    slug: "naval",
    emoji: "🧠",
    role: "创业、财富与判断力",
    focus: ["创业", "财富杠杆", "哲学"],
    signal: "用高度浓缩的判断框架讨论技术、财富、幸福与长期主义。",
    aliases: ["Naval Ravikant"],
    links: [{ label: "Website", url: "https://nav.al/" }],
  },
  {
    name: "Sahil Bloom",
    slug: "sahil-bloom",
    emoji: "🌱",
    role: "成长、商业与决策模型",
    focus: ["心智模型", "个人成长", "商业写作"],
    signal: "擅长把复杂商业与人生议题拆成可传播、可执行的模型。",
    links: [{ label: "Newsletter", url: "https://sahilbloom.com/" }],
  },
  {
    name: "Ali Abdaal",
    slug: "ali-abdaal",
    emoji: "⚡",
    role: "生产力与创作者教育",
    focus: ["生产力", "创作者经济", "学习方法"],
    signal: "从医生到教育创作者，长期追踪工作流、学习和创作者产品化。",
    links: [{ label: "Website", url: "https://aliabdaal.com/" }],
  },
  {
    name: "Justin Welsh",
    slug: "justin-welsh",
    emoji: "🏗️",
    role: "一人公司与B2B创作者",
    focus: ["一人公司", "LinkedIn", "数字产品"],
    signal: "持续拆解低复杂度、高利润率的独立业务搭建方法。",
    links: [{ label: "Website", url: "https://www.justinwelsh.me/" }],
  },
  {
    name: "Simon Willison",
    slug: "simon-willison",
    emoji: "🛠️",
    role: "LLM 工程、数据工具与开源",
    focus: ["LLM", "开源工具", "Datasette"],
    signal: "高频记录 AI 工程实践、模型评测、工具调用和安全边界。",
    links: [{ label: "Blog", url: "https://simonwillison.net/" }],
  },
  {
    name: "Eugene Yan",
    slug: "eugene-yan",
    emoji: "📊",
    role: "机器学习系统与推荐工程",
    focus: ["ML系统", "推荐系统", "AI工程"],
    signal: "把机器学习、产品系统和工程组织经验写成可复用的实践框架。",
    links: [{ label: "Blog", url: "https://eugeneyan.com/" }],
  },
  {
    name: "Andrej Karpathy",
    slug: "andrej-karpathy",
    emoji: "🧬",
    role: "AI 研究、教育与神经网络",
    focus: ["深度学习", "AI教育", "自动驾驶"],
    signal: "用第一性原理解释 AI 系统，从研究、教育到工程落地都有影响力。",
    links: [{ label: "Website", url: "https://karpathy.ai/" }],
  },
  {
    name: "Harrison Chase",
    slug: "harrison-chase",
    emoji: "🧩",
    role: "LangChain 创始人",
    focus: ["AI Agent", "RAG", "LLM应用开发"],
    signal: "LangChain 生态的核心推动者，代表 Agent 基础设施方向。",
    links: [{ label: "Blog", url: "https://blog.langchain.dev/" }],
  },
  {
    name: "Yohei Nakajima",
    slug: "yohei-nakajima",
    emoji: "🤖",
    role: "BabyAGI 创始人与投资人",
    focus: ["AI Agent", "自动化", "创业投资"],
    signal: "兼具 VC 和 Builder 视角，持续实验 Agent 自动化工作流。",
    links: [{ label: "Website", url: "https://yoheinakajima.com/" }],
  },
  {
    name: "Jerry Liu",
    slug: "jerry-liu",
    emoji: "🕸️",
    role: "LlamaIndex 创始人",
    focus: ["RAG", "数据连接", "知识图谱"],
    signal: "专注 LLM 应用的数据层，补齐 Agent 对外部知识的连接能力。",
    links: [{ label: "Blog", url: "https://www.llamaindex.ai/blog" }],
  },
];

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const daily = await loadReports("daily", path.join(REPORT_ROOT, "daily"), parseDaily);
  const weekly = await loadReports("weekly", path.join(REPORT_ROOT, "weekly"), parseWeekly);
  const topics = await loadReports("topics", path.join(REPORT_ROOT, "topics"), parseTopic);
  const candidates = await loadReports(
    "candidates",
    path.join(CANDIDATES_ROOT, "daily"),
    parseCandidateReport,
  );
  const thinkers = await buildThinkers(weekly, candidates);
  const dashboard = buildDashboard({ daily, weekly, topics, thinkers, candidates });
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      reports: REPORT_ROOT,
      candidates: CANDIDATES_ROOT,
    },
    counts: {
      daily: daily.length,
      weekly: weekly.length,
      topics: topics.length,
      candidates: candidates.length,
      thinkers: thinkers.length,
    },
  };

  await writeJson("daily.json", daily);
  await writeJson("weekly.json", weekly);
  await writeJson("topics.json", topics);
  await writeJson("candidates.json", candidates);
  await writeJson("thinkers.json", thinkers);
  await writeJson("dashboard.json", dashboard);
  await writeJson("manifest.json", manifest);

  console.log(`Synced ${daily.length} daily, ${weekly.length} weekly, ${topics.length} topics.`);
  console.log(`Generated ${thinkers.length} thinker profiles in ${path.relative(SITE_ROOT, DATA_DIR)}.`);
}

async function loadReports(type, directory, parser) {
  const files = await listMarkdown(directory);
  const reports = [];

  for (const file of files) {
    const markdown = await fs.readFile(file, "utf8");
    reports.push(parser(markdown, file, type));
  }

  return reports.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)));
}

async function listMarkdown(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function parseDaily(markdown, file) {
  const date = path.basename(file, ".md");
  const title = firstHeading(markdown) || `前沿话题日报 ${date}`;
  const sections = extractSections(markdown);
  const highlights = extractHighlightCards(markdown, "今日亮点");

  return {
    id: date,
    date,
    sortKey: date,
    title,
    excerpt: excerpt(markdown),
    sourcePath: file,
    tags: extractTags(markdown),
    highlights,
    sections,
    html: markdownToHtml(markdown),
    stats: extractDailyStats(markdown),
  };
}

function parseWeekly(markdown, file) {
  const week = path.basename(file, ".md");
  const title = firstHeading(markdown) || `前沿观察员周报 ${week}`;
  const entries = extractWeeklyEntries(markdown);

  return {
    id: week,
    week,
    sortKey: week,
    title,
    excerpt: excerpt(markdown),
    sourcePath: file,
    tags: extractTags(markdown),
    highlights: extractListSection(markdown, "本周亮点"),
    entries,
    sections: extractSections(markdown),
    html: markdownToHtml(markdown),
  };
}

function parseTopic(markdown, file) {
  const week = path.basename(file, ".md");
  const title = firstHeading(markdown) || `前沿话题追踪 ${week}`;

  return {
    id: week,
    week,
    sortKey: week,
    title,
    excerpt: excerpt(markdown),
    sourcePath: file,
    tags: extractTags(markdown),
    insights: extractListSection(markdown, "今日洞察"),
    sections: extractSections(markdown),
    html: markdownToHtml(markdown),
  };
}

function parseCandidateReport(markdown, file) {
  const date = path.basename(file, ".md");
  const candidates = extractCandidateCards(markdown);

  return {
    id: date,
    date,
    sortKey: date,
    title: firstHeading(markdown) || `每日前沿探索 ${date}`,
    excerpt: excerpt(markdown),
    sourcePath: file,
    candidates,
    tags: extractTags(markdown),
    html: markdownToHtml(markdown),
  };
}

async function buildThinkers(weeklyReports, candidateReports) {
  const profileMarkdown = await loadThinkerProfileMarkdown();
  const weeklyEntries = weeklyReports.flatMap((report) =>
    report.entries.map((entry) => ({ ...entry, week: report.week })),
  );
  const candidateCards = candidateReports.flatMap((report) =>
    report.candidates.map((candidate) => ({ ...candidate, date: report.date })),
  );

  return thinkerSeeds.map((seed) => {
    const names = [seed.name, ...(seed.aliases || [])].map(normalize);
    const profile = profileMarkdown.get(seed.slug);
    const matchedCandidate = candidateCards.find((candidate) => names.includes(normalize(candidate.name)));
    const recentUpdates = weeklyEntries
      .filter((entry) => names.includes(normalize(entry.person)))
      .slice(0, 6);
    const links = mergeLinks(seed.links || [], matchedCandidate?.links || []);
    const focus = matchedCandidate?.fields?.["领域"]
      ? splitFocus(matchedCandidate.fields["领域"])
      : seed.focus;

    return {
      ...seed,
      focus,
      links,
      candidateDate: matchedCandidate?.date || null,
      candidateLevel: matchedCandidate?.level || null,
      recommendation: matchedCandidate?.fields?.["推荐理由"] || null,
      value: matchedCandidate?.fields?.["价值"] || null,
      recentUpdates,
      sourceProfile: profile
        ? {
            title: firstHeading(profile.markdown) || seed.name,
            excerpt: excerpt(profile.markdown),
            html: markdownToHtml(profile.markdown),
          }
        : null,
      activityScore: recentUpdates.length * 2 + (matchedCandidate ? 3 : 0) + (profile ? 1 : 0),
    };
  });
}

async function loadThinkerProfileMarkdown() {
  const files = await listMarkdown(path.join(REPORT_ROOT, "thinkers"));
  const result = new Map();

  for (const file of files) {
    const slug = path.basename(file, ".md");
    if (!thinkerSeeds.some((seed) => seed.slug === slug)) continue;
    result.set(slug, { file, markdown: await fs.readFile(file, "utf8") });
  }

  return result;
}

function buildDashboard({ daily, weekly, topics, thinkers, candidates }) {
  const latestDaily = daily[0] || null;
  const latestWeekly = weekly[0] || null;
  const latestTopic = topics[0] || null;
  const allText = [
    ...daily.map((item) => item.title + "\n" + item.excerpt + "\n" + item.tags.join(" ")),
    ...weekly.map((item) => item.title + "\n" + item.excerpt + "\n" + item.tags.join(" ")),
    ...topics.map((item) => item.title + "\n" + item.excerpt + "\n" + item.tags.join(" ")),
    ...candidates.map((item) => item.title + "\n" + item.excerpt + "\n" + item.tags.join(" ")),
  ].join("\n");

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      daily: daily.length,
      weekly: weekly.length,
      topics: topics.length,
      thinkers: thinkers.length,
    },
    latestDaily,
    latestWeekly,
    latestTopic,
    activeThinkers: thinkers
      .slice()
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 5)
      .map(({ name, slug, emoji, role, activityScore, recentUpdates }) => ({
        name,
        slug,
        emoji,
        role,
        activityScore,
        latest: recentUpdates[0] || null,
      })),
    tagCloud: buildTagCloud(allText, [...daily, ...weekly, ...topics].flatMap((item) => item.tags)),
  };
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? cleanTitle(match[1]) : "";
}

function extractSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading && heading[1].length === 2) {
      if (current) sections.push(finalizeSection(current));
      current = { title: cleanTitle(heading[2]), markdown: "", level: 2 };
      continue;
    }
    if (current) current.markdown += `${line}\n`;
  }

  if (current) sections.push(finalizeSection(current));
  return sections;
}

function finalizeSection(section) {
  return {
    title: section.title,
    excerpt: excerpt(section.markdown),
    html: markdownToHtml(section.markdown),
  };
}

function extractHighlightCards(markdown, sectionName) {
  const text = getSection(markdown, sectionName);
  const chunks = splitByHeading(text, 3);

  return chunks
    .map((chunk) => {
      const title = cleanTitle(chunk.title.replace(/^\d+\.\s*/, ""));
      if (!title) return null;
      const link = findField(chunk.body, "链接");
      const heat = findField(chunk.body, "热度");
      const read = findField(chunk.body, "解读");
      const relation = findField(chunk.body, "关联");

      return {
        title,
        url: normalizeUrl(link),
        heat,
        summary: read || excerpt(chunk.body),
        relation,
      };
    })
    .filter(Boolean);
}

function extractListSection(markdown, sectionName) {
  const text = getSection(markdown, sectionName);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+|^\d+\.\s+|^[🔥⚠️🛡️🌱💡🎯]/.test(line))
    .map((line) => cleanText(line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")))
    .filter(Boolean);
}

function extractWeeklyEntries(markdown) {
  const core = getSection(markdown, "核心观点") || markdown;
  const chunks = splitByHeading(core, 3);

  return chunks
    .map((chunk) => {
      const person = cleanTitle(chunk.title);
      if (!person) return null;
      const titleMatch = chunk.body.match(/^\*\*(.+?)\*\*\s*$/m);
      const quoteMatch = chunk.body.match(/^>\s*(.+)$/m);
      const date = findField(chunk.body, "发布时间");
      const url = normalizeUrl(findField(chunk.body, "原文链接"));

      return {
        person,
        title: cleanText(titleMatch?.[1] || ""),
        excerpt: cleanText(quoteMatch?.[1] || excerpt(chunk.body)),
        date,
        url,
      };
    })
    .filter((entry) => entry && (entry.title || entry.excerpt));
}

function extractCandidateCards(markdown) {
  const chunks = splitByHeading(markdown, 4);
  const cards = [];

  for (const chunk of chunks) {
    const match = chunk.title.match(/^\d+\.\s*([^-]+?)(?:\s+-\s+(.+))?$/);
    if (!match) continue;
    const fields = {};
    const links = [];

    for (const line of chunk.body.split(/\r?\n/)) {
      const field = line.match(/^-\s+\*\*(.+?)\*\*：\s*(.+)$/);
      if (field) {
        fields[cleanText(field[1])] = cleanText(field[2]);
        continue;
      }

      const link = line.match(/-\s+([^:]+):\s*(https?:\/\/\S+)/);
      if (link) {
        links.push({ label: cleanText(link[1]), url: normalizeUrl(link[2]) });
      }
    }

    cards.push({
      name: cleanText(match[1]),
      role: cleanText(match[2] || ""),
      level: inferCandidateLevel(markdown, chunk.title),
      fields,
      links,
    });
  }

  return cards;
}

function inferCandidateLevel(markdown, title) {
  const before = markdown.slice(0, markdown.indexOf(`#### ${title}`));
  const levels = [...before.matchAll(/^###\s+(.+)$/gm)].map((match) => cleanTitle(match[1]));
  return levels.at(-1) || "";
}

function extractDailyStats(markdown) {
  const hotScoreMatches = [...markdown.matchAll(/(\d+)分/g)].map((match) => Number(match[1]));
  const commentMatches = [...markdown.matchAll(/(\d+)评论|(\d+)评/g)].map((match) =>
    Number(match[1] || match[2]),
  );

  return {
    maxScore: hotScoreMatches.length ? Math.max(...hotScoreMatches) : null,
    maxComments: commentMatches.length ? Math.max(...commentMatches) : null,
    topicCount: [...markdown.matchAll(/^\|\s*\*\*/gm)].length || null,
  };
}

function getSection(markdown, sectionName) {
  const lines = markdown.split(/\r?\n/);
  let capture = false;
  let level = 0;
  const output = [];

  for (const line of lines) {
    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      const headingLevel = heading[1].length;
      const title = cleanTitle(heading[2]);

      if (capture && headingLevel <= level) break;
      if (title.includes(sectionName)) {
        capture = true;
        level = headingLevel;
        continue;
      }
    }

    if (capture) output.push(line);
  }

  return output.join("\n").trim();
}

function splitByHeading(markdown, level) {
  const regex = new RegExp(`^#{${level}}\\s+(.+)$`, "gm");
  const matches = [...markdown.matchAll(regex)];
  const chunks = [];

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    chunks.push({
      title: match[1],
      body: markdown.slice(start, end).trim(),
    });
  });

  return chunks;
}

function extractTags(markdown) {
  const tagCandidates = new Map();
  const headings = [...markdown.matchAll(/^#{2,4}\s+(.+)$/gm)]
    .map((match) => cleanTitle(match[1]).replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
  const boldTopics = [...markdown.matchAll(/\*\*([^*\n]{2,48})\*\*/g)].map((match) => cleanTitle(match[1]));

  for (const tag of [...headings, ...boldTopics]) {
    if (!tag || tag.length > 36) continue;
    if (/链接|发布时间|报告时间|热度|解读|关联/.test(tag)) continue;
    tagCandidates.set(tag, (tagCandidates.get(tag) || 0) + 1);
  }

  return [...tagCandidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([tag]) => tag);
}

function buildTagCloud(text, explicitTags) {
  const dictionary = [
    "AI",
    "Agent",
    "LLM",
    "RAG",
    "开源",
    "安全",
    "隐私",
    "编程语言",
    "开发者工具",
    "基础设施",
    "硬件",
    "Cloudflare",
    "Linux",
    "Mojo",
    "Rust",
    "Go",
    "Hacker News",
    "Product Hunt",
    "Simon Willison",
    "Naval",
    "Eugene Yan",
    "Sahil Bloom",
    "Andrej Karpathy",
    "LangChain",
    "LlamaIndex",
    "创业",
    "自动化",
    "浏览器",
    "数据",
    "社区",
  ];
  const counts = new Map();

  for (const tag of explicitTags) {
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  for (const term of dictionary) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = text.match(regex);
    if (matches?.length) counts.set(term, (counts.get(term) || 0) + matches.length * 2);
  }

  const max = Math.max(...counts.values(), 1);
  return [...counts.entries()]
    .filter(([tag]) => tag.length <= 28)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 32)
    .map(([tag, count]) => ({
      tag,
      count,
      weight: Number((0.75 + (count / max) * 1.25).toFixed(2)),
    }));
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeBuffer = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^\s*\|.+\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1] || "")) {
      flushParagraph();
      flushList();
      const rows = [];
      rows.push(splitTableRow(line));
      index += 2;
      while (index < lines.length && /^\s*\|.+\|\s*$/.test(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      html.push(tableToHtml(rows));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 1, 6);
      html.push(`<h${level}>${inlineMarkdown(cleanTitle(heading[2]))}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const targetType = unordered ? "ul" : "ol";
      if (listType !== targetType) {
        flushList();
        listType = targetType;
        html.push(`<${listType}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  return html.join("\n");
}

function tableToHtml(rows) {
  const [head, ...body] = rows;
  const header = `<thead><tr>${head.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`;
  const bodyHtml = `<tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="table-wrap"><table>${header}${bodyHtml}</table></div>`;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function inlineMarkdown(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  output = output.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>',
  );
  return output;
}

function findField(markdown, label) {
  const patterns = [
    new RegExp(`^-\\s+\\*\\*${label}\\*\\*：\\s*(.+)$`, "m"),
    new RegExp(`^\\*\\*${label}\\*\\*：\\s*(.+)$`, "m"),
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) return cleanText(match[1]);
  }

  return "";
}

function excerpt(markdown, maxLength = 150) {
  const text = cleanText(
    markdown
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed &&
          !trimmed.startsWith("#") &&
          !trimmed.startsWith("---") &&
          !trimmed.startsWith("|---") &&
          !trimmed.startsWith("**报告时间**")
        );
      })
      .join(" "),
  );

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function cleanTitle(text) {
  return cleanText(text)
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "")
    .trim();
}

function cleanText(text = "") {
  return String(text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/&[#\w]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFocus(text) {
  return cleanText(text)
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeUrl(text) {
  const match = String(text || "").match(/https?:\/\/\S+/);
  return match ? match[0].replace(/[)）。，,]+$/, "") : "";
}

function normalize(text) {
  return cleanText(text).toLowerCase().replace(/\s+/g, " ");
}

function mergeLinks(...groups) {
  const seen = new Set();
  const result = [];

  for (const links of groups.flat()) {
    if (!links?.url || seen.has(links.url)) continue;
    seen.add(links.url);
    result.push(links);
  }

  return result;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function writeJson(filename, value) {
  await fs.writeFile(path.join(DATA_DIR, filename), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

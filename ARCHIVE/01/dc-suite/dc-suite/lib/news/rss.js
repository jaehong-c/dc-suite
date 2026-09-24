// Minimal RSS 2.0 reader for public news-search feeds. Two sources per query:
// Google News (broad coverage, no images) and Bing News (thumbnails, direct
// article links). No dependencies; the feeds are stable enough that a small
// tag parser is safer than a full XML library for five fields.

const GOOGLE_BASE = "https://news.google.com/rss/search";
const BING_BASE = "https://www.bing.com/news/search";

export function googleFeedUrl(query) {
  const params = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" });
  return `${GOOGLE_BASE}?${params.toString()}`;
}

export function bingFeedUrl(query) {
  const params = new URLSearchParams({ q: query, format: "rss", mkt: "en-US" });
  return `${BING_BASE}?${params.toString()}`;
}

// Kept for callers that only know the old name.
export const feedUrl = googleFeedUrl;

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function attr(block, tagName, attrName) {
  const m = block.match(new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']+)["']`, "i"));
  return m ? decode(m[1]) : "";
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Bing wraps article links in a redirect with the real URL in ?url=.
function unwrapLink(link) {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith("bing.com")) {
      const real = u.searchParams.get("url");
      if (real) return real;
    }
  } catch {}
  return link;
}

function stripSourceSuffix(title, source) {
  if (source && title.endsWith(` - ${source}`)) return title.slice(0, -(source.length + 3));
  return title;
}

export function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const rawTitle = tag(block, "title");
    const source = tag(block, "source") || tag(block, "News:Source");
    const title = stripSourceSuffix(rawTitle, source);
    const link = unwrapLink(tag(block, "link"));
    const pubDate = tag(block, "pubDate");
    const ts = Date.parse(pubDate);
    const image =
      tag(block, "News:Image") ||
      attr(block, "media:content", "url") ||
      attr(block, "media:thumbnail", "url") ||
      attr(block, "enclosure", "url") ||
      "";
    const sourceUrl = attr(block, "source", "url");
    const domain = hostOf(sourceUrl) || (hostOf(link).includes("google.com") ? "" : hostOf(link));
    if (!title || !link) continue;
    items.push({
      title,
      link,
      source: source || domain,
      domain,
      image: image || null,
      publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
    });
  }
  return items;
}

function normalizeTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Merge lists in priority order. The first occurrence of a headline wins,
// but a later duplicate can fill in a missing image, domain or date.
export function mergeItems(lists, { limit = 40, maxAgeDays = 21 } = {}) {
  const byKey = new Map();
  const cutoff = Date.now() - maxAgeDays * 86400000;
  for (const list of lists) {
    for (const it of list) {
      const key = normalizeTitle(it.title).slice(0, 80);
      if (!key) continue;
      if (it.publishedAt && Date.parse(it.publishedAt) < cutoff) continue;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...it });
      } else {
        if (!prev.image && it.image) prev.image = it.image;
        if (!prev.domain && it.domain) prev.domain = it.domain;
        if (!prev.publishedAt && it.publishedAt) prev.publishedAt = it.publishedAt;
      }
    }
  }
  const out = Array.from(byKey.values());
  out.sort((a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0));
  return out.slice(0, limit);
}

async function readFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DCWire/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return parseRss(await res.text());
  } catch {
    return [];
  }
}

export async function fetchTopic(topic) {
  // Bing first so its direct links and thumbnails win on duplicates; Google
  // fills the gaps. Either source failing leaves the other intact.
  const bing = await Promise.all(topic.queries.map((q) => readFeed(bingFeedUrl(q))));
  const google = await Promise.all(topic.queries.map((q) => readFeed(googleFeedUrl(q))));
  return mergeItems([...bing, ...google]);
}

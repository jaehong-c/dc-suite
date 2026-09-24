// Minimal RSS 2.0 reader for Google News search feeds. No dependencies; the
// feed shape is stable enough that a small tag parser is safer than pulling
// in a full XML library for four fields.

const FEED_BASE = "https://news.google.com/rss/search";

export function feedUrl(query) {
  const params = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" });
  return `${FEED_BASE}?${params.toString()}`;
}

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

export function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const rawTitle = tag(block, "title");
    const source = tag(block, "source");
    // Google News appends " - Source" to titles; strip it when we know the source.
    const title =
      source && rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -(source.length + 3)) : rawTitle;
    const link = tag(block, "link");
    const pubDate = tag(block, "pubDate");
    const ts = Date.parse(pubDate);
    if (!title || !link) continue;
    items.push({
      title,
      link,
      source: source || hostOf(link),
      publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
    });
  }
  return items;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function mergeItems(lists, { limit = 40, maxAgeDays = 21 } = {}) {
  const seen = new Set();
  const cutoff = Date.now() - maxAgeDays * 86400000;
  const out = [];
  for (const list of lists) {
    for (const it of list) {
      const key = normalizeTitle(it.title).slice(0, 80);
      if (!key || seen.has(key)) continue;
      if (it.publishedAt && Date.parse(it.publishedAt) < cutoff) continue;
      seen.add(key);
      out.push(it);
    }
  }
  out.sort((a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0));
  return out.slice(0, limit);
}

export async function fetchTopic(topic) {
  const results = await Promise.all(
    topic.queries.map(async (q) => {
      try {
        const res = await fetch(feedUrl(q), {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DCWire/1.0)" },
          next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        return parseRss(await res.text());
      } catch {
        return [];
      }
    })
  );
  return mergeItems(results);
}

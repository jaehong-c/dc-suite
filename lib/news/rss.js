// Minimal reader for public news-search feeds. Four sources per query, in
// priority order: Bing News (direct article links, thumbnails), GDELT
// (direct links, the article's own social image, very broad index), Yahoo
// News (direct links, images) and Google News (broadest coverage, but
// redirect links and no images). No dependencies; the feeds are stable
// enough that a small tag parser is safer than a full XML library for five
// fields.
//
// After merging, Google redirect links are swapped for the publisher URL
// (see gnews.js), then items that still have no picture get one from the
// article page itself (its og:image tag), a few at a time, with a short
// timeout and an in-memory cache so a slow publisher never holds the feed
// up for long. Both steps are best-effort and stop at a deadline.
//
// Because Google rate-limits link resolution, the previous daily edition is
// reused as a memory: a headline already resolved yesterday keeps its
// publisher link and image today without asking Google again.

import { resolveGoogleLinks } from "./gnews.js";

const GOOGLE_BASE = "https://news.google.com/rss/search";
const BING_BASE = "https://www.bing.com/news/search";
const YAHOO_BASE = "https://news.search.yahoo.com/rss";
const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const FEED_TIMEOUT_MS = 8000;
const GDELT_TIMEOUT_MS = 20000; // GDELT is thorough and slow; only the cron waits this long
const UA = "Mozilla/5.0 (compatible; DCWire/1.0; +https://dc-suite.vercel.app)";

export function googleFeedUrl(query) {
  const params = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" });
  return `${GOOGLE_BASE}?${params.toString()}`;
}

export function bingFeedUrl(query) {
  const params = new URLSearchParams({ q: query, format: "rss", mkt: "en-US" });
  return `${BING_BASE}?${params.toString()}`;
}

export function yahooFeedUrl(query) {
  const params = new URLSearchParams({ p: query });
  return `${YAHOO_BASE}?${params.toString()}`;
}

// GDELT understands OR itself, but only inside parentheses:
// `"data center" financing OR "credit facility" OR bond` becomes
// `"data center" (financing OR "credit facility" OR bond)`.
export function toGdeltQuery(query) {
  if (query.includes("(")) return query; // already in GDELT form
  const tokens = query.match(/"[^"]*"|\S+/g) || [];
  if (!tokens.includes("OR")) return query;
  const firstOr = tokens.indexOf("OR");
  const prefix = tokens.slice(0, Math.max(0, firstOr - 1));
  const alts = [tokens[firstOr - 1]];
  let i = firstOr;
  while (i < tokens.length && tokens[i] === "OR" && i + 1 < tokens.length) {
    alts.push(tokens[i + 1]);
    i += 2;
  }
  const suffix = tokens.slice(i);
  return [...prefix, `(${alts.filter(Boolean).join(" OR ")})`, ...suffix].join(" ");
}

// GDELT DOC 2.0: free, no key, indexes most news sites and returns each
// article's own social image. Slow (often 5 to 15 seconds a query), so it
// runs in the daily cron, one query per topic where the topic's queries
// share a leading phrase, and the live feed only uses it on request.
export function gdeltUrl(query) {
  const params = new URLSearchParams({
    query: `${toGdeltQuery(query)} sourcelang:english`,
    mode: "ArtList",
    format: "json",
    maxrecords: "75",
    timespan: "21d",
  });
  return `${GDELT_BASE}?${params.toString()}`;
}

// One GDELT query for a topic when its queries share a first phrase:
//   "data center" lease signed
//   "data center" acquisition OR "joint venture"
//   "data center" financing OR "credit facility" OR bond
// becomes
//   "data center" (lease OR signed OR acquisition OR "joint venture" OR financing OR "credit facility" OR bond)
// Otherwise each query is sent on its own (at most three).
export function gdeltQueries(topic) {
  const lists = topic.queries.map((q) => q.match(/"[^"]*"|\S+/g) || []);
  const head = lists[0]?.[0];
  if (lists.length > 1 && head && lists.every((t) => t[0] === head)) {
    const alts = [];
    for (const t of lists) for (const tok of t.slice(1)) if (tok !== "OR" && !alts.includes(tok)) alts.push(tok);
    return alts.length ? [`${head} (${alts.join(" OR ")})`] : [head];
  }
  return topic.queries.slice(0, 3);
}

// Kept for callers that only know the old name.
export const feedUrl = googleFeedUrl;

// Bing and Yahoo return few results for queries written with OR, so a
// query like `"data center" financing OR "credit facility" OR bond` is
// split into one query per alternative: `"data center" financing`,
// `"data center" "credit facility"`, `"data center" bond`. Google handles
// OR itself and keeps the original.
export function expandOr(query) {
  const tokens = query.match(/"[^"]*"|\S+/g) || [];
  if (!tokens.includes("OR")) return [query];
  const firstOr = tokens.indexOf("OR");
  const prefix = tokens.slice(0, Math.max(0, firstOr - 1));
  const alts = [tokens[firstOr - 1]];
  let i = firstOr;
  while (i < tokens.length && tokens[i] === "OR" && i + 1 < tokens.length) {
    alts.push(tokens[i + 1]);
    i += 2;
  }
  const suffix = tokens.slice(i);
  return alts.filter(Boolean).map((a) => [...prefix, a, ...suffix].join(" "));
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

function isGoogle(link) {
  return hostOf(link).includes("google.com");
}

// Bing and Yahoo wrap article links in a redirect with the real URL inside.
function unwrapLink(link) {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith("bing.com")) {
      const real = u.searchParams.get("url");
      if (real) return real;
    }
    if (u.hostname.endsWith("yahoo.com") && u.pathname.startsWith("/_ylt")) {
      // r.search.yahoo.com/_ylt=.../RU=<encoded url>/RK=...
      const m = u.pathname.match(/\/RU=([^/]+)\//);
      if (m) return decodeURIComponent(m[1]);
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
    const domain = hostOf(sourceUrl) || (isGoogle(link) ? "" : hostOf(link));
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

// GDELT seendate looks like 20260928T143000Z.
function gdeltDate(v) {
  const m = String(v || "").match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

// GDELT re-tokenizes titles ("October 7 , 2026 , at 5 : 00 p . m ." and a
// trailing " - Publisher"); put the punctuation back and drop the suffix so
// the same story de-duplicates against Bing and Google.
export function tidyGdeltTitle(raw) {
  let t = decode(String(raw || ""))
    .replace(/\s+([,.:;!?%)\]])/g, "$1")
    .replace(/([($\[])\s+/g, "$1")
    .replace(/(\d)\s*:\s*(\d)/g, "$1:$2")
    .replace(/\b([ap])\.\s*m\b\.?/gi, "$1.m.")
    .replace(/\s{2,}/g, " ")
    .trim();
  const m = t.match(/^(.*\S)\s+-\s+([^-]{2,40})$/);
  if (m && m[2].split(/\s+/).length <= 4 && !/\d/.test(m[2])) t = m[1];
  return t;
}

export function parseGdelt(json) {
  const items = [];
  for (const a of json?.articles || []) {
    const title = tidyGdeltTitle(a?.title);
    const link = String(a?.url || "");
    if (!title || !/^https?:\/\//.test(link)) continue;
    const domain = hostOf(link);
    const image = a?.socialimage && /^https?:\/\//.test(a.socialimage) ? a.socialimage : null;
    items.push({ title, link, source: domain, domain, image, publishedAt: gdeltDate(a?.seendate) });
  }
  return items;
}

export function normalizeTitle(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
}

// Merge lists in priority order. The first occurrence of a headline wins,
// but a later duplicate can fill in a missing image, domain, date or
// publisher name, and a direct publisher link always beats a Google
// redirect for the same story. The final cut favors direct-link stories (a
// story with a real link can carry a picture, a Google redirect cannot) but
// keeps a few slots for the newest Google-only ones, since Google News
// ranks for prominence and catches what the others miss; then sorts by date.
export function mergeItems(lists, { limit = 40, maxAgeDays = 21, reserve = 8 } = {}) {
  const byKey = new Map();
  const cutoff = Date.now() - maxAgeDays * 86400000;
  for (const list of lists) {
    for (const it of list) {
      const key = normalizeTitle(it.title);
      if (!key) continue;
      if (it.publishedAt && Date.parse(it.publishedAt) < cutoff) continue;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { ...it });
      } else {
        if (!prev.image && it.image) prev.image = it.image;
        if (!prev.domain && it.domain) prev.domain = it.domain;
        if (!prev.publishedAt && it.publishedAt) prev.publishedAt = it.publishedAt;
        if ((!prev.source || prev.source === prev.domain) && it.source && it.source !== it.domain) prev.source = it.source;
        if (isGoogle(prev.link) && !isGoogle(it.link)) prev.link = it.link;
      }
    }
  }
  const all = Array.from(byKey.values());
  const byDate = (a, b) => (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0);
  const direct = all.filter((it) => !isGoogle(it.link)).sort(byDate);
  const google = all.filter((it) => isGoogle(it.link)).sort(byDate);
  const firstCut = direct.slice(0, Math.max(0, limit - reserve));
  const fill = google.slice(0, Math.max(0, limit - firstCut.length));
  const more = direct.slice(firstCut.length, firstCut.length + Math.max(0, limit - firstCut.length - fill.length));
  return [...firstCut, ...fill, ...more].sort(byDate);
}

async function readWithTimeout(url, accept) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      next: { revalidate: 3600 },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readFeed(url) {
  const text = await readWithTimeout(url, "application/rss+xml, application/xml, text/xml");
  return text ? parseRss(text) : [];
}

// `note` collects status counts and a snippet of the first empty or failed
// answer for the diagnostics. The call gives up at the deadline.
async function readGdelt(url, note, deadline) {
  const wait = Math.max(1000, Math.min(GDELT_TIMEOUT_MS, deadline - Date.now()));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), wait);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: ctrl.signal,
    });
    const text = await res.text();
    note.calls += 1;
    note.status[res.status] = (note.status[res.status] || 0) + 1;
    note.ms = Math.max(note.ms, Date.now() - t0);
    let items = [];
    try {
      items = parseGdelt(JSON.parse(text));
    } catch {
      items = []; // GDELT answers plain text when it dislikes a query or is throttling
    }
    if (!items.length && !note.sample) note.sample = { status: res.status, text: text.replace(/\s+/g, " ").slice(0, 200) };
    return items;
  } catch (e) {
    note.errors += 1;
    note.ms = Math.max(note.ms, Date.now() - t0);
    if (!note.sample) note.sample = { status: 0, text: String(e?.message || e).slice(0, 200) };
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Memory of earlier runs ----------

// Build a headline -> { link, domain, image } map from a saved edition, so
// what was resolved once is not asked for again. Only direct publisher
// links count; a Google link teaches nothing.
export function knownFromSnapshot(snapshot) {
  const known = new Map();
  const topics = snapshot?.topics || {};
  for (const t of Object.values(topics)) {
    for (const it of t?.items || []) {
      if (!it?.title || !it.link || isGoogle(it.link)) continue;
      const key = normalizeTitle(it.title);
      const prev = known.get(key);
      if (!prev || (!prev.image && it.image)) {
        known.set(key, { link: it.link, domain: it.domain || hostOf(it.link), image: it.image || null });
      }
    }
  }
  return known;
}

function applyKnown(items, known) {
  let hits = 0;
  if (!known || !known.size) return hits;
  for (const it of items) {
    const k = known.get(normalizeTitle(it.title));
    if (!k) continue;
    if (isGoogle(it.link)) {
      it.link = k.link;
      if (!it.domain) it.domain = k.domain;
      hits += 1;
    }
    if (!it.image && k.image) it.image = k.image;
  }
  return hits;
}

// ---------- Article images (og:image) ----------

const OG_CACHE = new Map(); // link -> { image, until }
const OG_TTL_MS = 6 * 3600 * 1000;
const OG_TIMEOUT_MS = 5000;
const OG_MAX_BYTES = 160000;

function pickOgImage(html, base) {
  const head = html.split(/<\/head>/i)[0] || html;
  const metas = head.match(/<meta\s+[^>]*>/gi) || [];
  const keys = ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"];
  for (const key of keys) {
    for (const m of metas) {
      if (!new RegExp(`(?:property|name)=["']${key}["']`, "i").test(m)) continue;
      const c = m.match(/content=["']([^"']+)["']/i);
      if (!c || !c[1]) continue;
      try {
        const u = new URL(decode(c[1]), base);
        if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
      } catch {}
    }
  }
  return null;
}

async function fetchOgImage(link) {
  const cached = OG_CACHE.get(link);
  if (cached && cached.until > Date.now()) return cached.image;

  let image = null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OG_TIMEOUT_MS);
  try {
    const res = await fetch(link, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
    });
    const type = res.headers.get("content-type") || "";
    if (res.ok && type.includes("html") && res.body) {
      // Read only the head of the page; the meta tags are at the top.
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let html = "";
      while (html.length < OG_MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
      image = pickOgImage(html, res.url || link);
    }
  } catch {
    image = null;
  } finally {
    clearTimeout(timer);
  }
  OG_CACHE.set(link, { image, until: Date.now() + OG_TTL_MS });
  return image;
}

// Fill missing images for the first `max` items that have a direct publisher
// link, `concurrency` at a time, stopping at `deadline`. Google redirect
// links are skipped: they do not resolve to the article without a browser.
export async function enrichImages(items, { max = 24, concurrency = 6, deadline = Infinity } = {}) {
  const targets = items.filter((it) => !it.image && it.link && !isGoogle(it.link)).slice(0, max);
  let next = 0;
  let looked = 0;
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (next < targets.length && Date.now() < deadline) {
      const it = targets[next++];
      looked += 1;
      it.image = await fetchOgImage(it.link);
    }
  });
  await Promise.all(workers);
  return { candidates: targets.length, looked };
}

// ---------- One topic, end to end ----------

// options:
//   fresh     bypass the Google resolver's cool-off and cache (debugging)
//   known     Map from knownFromSnapshot(): yesterday's resolved links/images
//   deadline  ms epoch after which no new network lookups start
//   gdelt     also query GDELT (slow; the cron does, the live feed only on request)
export async function fetchTopic(topic, { fresh = false, known = null, deadline = Infinity, gdelt: useGdelt = false } = {}) {
  // Direct-link sources first so their links and thumbnails win on
  // duplicates; Google fills the gaps. Any source failing leaves the others
  // intact.
  const direct = topic.queries.flatMap(expandOr);
  const gdeltNote = { enabled: useGdelt, queries: useGdelt ? gdeltQueries(topic) : [], calls: 0, status: {}, errors: 0, ms: 0, sample: null };
  const gdeltDeadline = Number.isFinite(deadline) ? deadline : Date.now() + GDELT_TIMEOUT_MS;
  const [bing, gdelt, yahoo, google] = await Promise.all([
    Promise.all(direct.map((q) => readFeed(bingFeedUrl(q)))),
    Promise.all(gdeltNote.queries.map((q) => readGdelt(gdeltUrl(q), gdeltNote, gdeltDeadline))),
    Promise.all(direct.map((q) => readFeed(yahooFeedUrl(q)))),
    Promise.all(topic.queries.map((q) => readFeed(googleFeedUrl(q)))),
  ]);
  const items = mergeItems([...bing, ...gdelt, ...yahoo, ...google]);

  const fromKnown = applyKnown(items, known);
  const resolve = await resolveGoogleLinks(items, { fresh, deadline });
  const images = await enrichImages(items, { deadline });

  // Non-index property: invisible to JSON.stringify of the array, readable
  // by the routes for their diagnostics field.
  items.diagnostics = {
    sources: {
      bing: bing.reduce((n, l) => n + l.length, 0),
      gdelt: gdelt.reduce((n, l) => n + l.length, 0),
      yahoo: yahoo.reduce((n, l) => n + l.length, 0),
      google: google.reduce((n, l) => n + l.length, 0),
    },
    gdelt: gdeltNote,
    fromKnown,
    resolve,
    images,
  };
  items.resolveStats = resolve;
  return items;
}

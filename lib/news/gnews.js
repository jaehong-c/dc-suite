// Resolves Google News redirect links (news.google.com/rss/articles/...) to
// the publisher's own URL. Google no longer puts the target in the link, so
// this follows the same two-step exchange the Google News web app makes:
// read two signing parameters from the article stub page, then ask the
// batchexecute endpoint for that one article's URL.
//
// Google rate-limits this by IP and answers 429 quickly when asked in
// bursts, so every request in this process goes through ONE queue with a
// pause between calls, whatever topic asked for it. A 429 puts the whole
// process into a cool-off (Retry-After if Google sends one). Callers pass a
// deadline; links that are not resolved by then simply stay as Google links
// and get another chance on the next run. Everything is best-effort: any
// failure leaves the link in place, which is the situation before this file
// existed. Stats are attached so the feed route can report what happened.

const STUB_BASE = "https://news.google.com/articles/";
const BATCH_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const CACHE = new Map(); // article id -> { url, until }
const CACHE_TTL_MS = 24 * 3600 * 1000; // successful lookups
const FAIL_TTL_MS = 5 * 60 * 1000; // failed lookups: retry soon, Google blocks are short-lived
const STUB_TIMEOUT_MS = 5000;
const DECODE_TIMEOUT_MS = 6000;
const BACKOFF_MS = 15 * 60 * 1000; // after a 429, leave Google alone for a while
const GAP_MS = 500; // pause between requests, process-wide; Google throttles bursts

let blockedUntil = 0;
let queue = Promise.resolve(); // process-wide serialization of Google calls

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run fn after every previously queued call has finished, then pause.
function serialized(fn) {
  const run = queue.then(fn, fn).then(
    async (v) => {
      await sleep(GAP_MS);
      return v;
    },
    async (e) => {
      await sleep(GAP_MS);
      throw e;
    }
  );
  queue = run.catch(() => {});
  return run;
}

export function googleArticleId(link) {
  try {
    const u = new URL(link);
    if (!u.hostname.endsWith("news.google.com")) return null;
    const m = u.pathname.match(/\/articles\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// First 200 visible characters of a response, for the diagnostics field.
function snippet(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function noteBlock(res) {
  if (res.status !== 429) return;
  const retry = Number(res.headers.get("retry-after"));
  const wait = Number.isFinite(retry) && retry > 0 ? Math.max(BACKOFF_MS, retry * 1000) : BACKOFF_MS;
  blockedUntil = Math.max(blockedUntil, Date.now() + wait);
}

async function fetchSigningParams(id, stats) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), STUB_TIMEOUT_MS);
  try {
    const res = await fetch(STUB_BASE + id, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    stats.stub[res.status] = (stats.stub[res.status] || 0) + 1;
    const html = await res.text();
    noteBlock(res);
    if (!res.ok) {
      if (!stats.sample) stats.sample = { step: "stub", status: res.status, text: snippet(html) };
      return null;
    }
    const sg = html.match(/data-n-a-sg="([^"]+)"/);
    const ts = html.match(/data-n-a-ts="([^"]+)"/);
    if (!sg || !ts) {
      stats.noParams += 1;
      if (!stats.sample) stats.sample = { step: "stub", status: res.status, text: snippet(html) };
      return null;
    }
    return { id, sg: sg[1], ts: ts[1] };
  } catch (e) {
    stats.stubErrors += 1;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function payloadFor(p) {
  const req = [
    "Fbv4je",
    `["garturlreq",[["en-US","US",["FINANCE_TOP_INDICES","WEB_TEST_1_0_0"],null,null,1,1,"US:en",null,180,null,null,null,null,null,0,null,null,[1608992183,723341000]],"en-US","US",1,[2,3,4,8],1,0,"655000234",0,0,null,0],"${p.id}",${p.ts},"${p.sg}"]`,
    null,
    "generic",
  ];
  return "f.req=" + encodeURIComponent(JSON.stringify([[req]]));
}

async function decodeOne(p, stats) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DECODE_TIMEOUT_MS);
  try {
    const res = await fetch(BATCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: payloadFor(p),
      signal: ctrl.signal,
      cache: "no-store",
    });
    stats.decode[res.status] = (stats.decode[res.status] || 0) + 1;
    const text = await res.text();
    noteBlock(res);
    if (!res.ok) {
      if (!stats.sample) stats.sample = { step: "decode", status: res.status, text: snippet(text) };
      return null;
    }
    // Response: an anti-JSON prefix line, a blank line, then the JSON array
    // (sometimes preceded by a byte count). Skip to the first "[".
    const chunk = text.split("\n\n")[1] || text;
    const start = chunk.indexOf("[");
    if (start < 0) return null;
    const rows = JSON.parse(chunk.slice(start));
    for (const r of rows) {
      if (!Array.isArray(r) || r[0] !== "wrb.fr" || typeof r[2] !== "string") continue;
      try {
        const inner = JSON.parse(r[2]);
        const url = Array.isArray(inner) ? inner[1] : null;
        if (typeof url === "string" && /^https?:\/\//.test(url)) return url;
      } catch {}
    }
    stats.noUrl += 1;
    if (!stats.sample) stats.sample = { step: "decode", status: res.status, text: snippet(text) };
    return null;
  } catch {
    stats.decodeErrors += 1;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Rewrite item.link in place for up to `max` Google-linked items, one Google
// request at a time process-wide, stopping at `deadline` (ms epoch) or on a
// block. Returns stats: how many were Google links, how many came from
// cache, how many resolved, the HTTP status counts seen at each step, and
// how many were left for next time.
export async function resolveGoogleLinks(items, { max = 12, fresh = false, deadline = Infinity } = {}) {
  const now = Date.now();
  const stats = {
    google: 0,
    cached: 0,
    attempted: 0,
    resolved: 0,
    skipped: 0,
    stub: {},
    decode: {},
    stubErrors: 0,
    noParams: 0,
    decodeErrors: 0,
    noUrl: 0,
    sample: null,
    backoff: false,
  };
  // ?fresh=1 clears the cool-off so a manual retry always goes to the network.
  if (fresh) blockedUntil = 0;
  const pending = [];
  for (const it of items) {
    const id = googleArticleId(it.link);
    if (!id) continue;
    stats.google += 1;
    const cached = fresh ? null : CACHE.get(id);
    if (cached && cached.until > now) {
      stats.cached += 1;
      if (cached.url) {
        it.link = cached.url;
        stats.resolved += 1;
      }
      continue;
    }
    if (pending.length < max) pending.push({ it, id });
    else stats.skipped += 1;
  }
  if (Date.now() < blockedUntil) {
    stats.backoff = true;
    stats.skipped += pending.length;
    return stats;
  }

  for (const { it, id } of pending) {
    // Each step re-checks: a 429 or the deadline can arrive while queued.
    if (Date.now() < blockedUntil || Date.now() > deadline) {
      stats.skipped += 1;
      if (Date.now() < blockedUntil) stats.backoff = true;
      continue;
    }
    stats.attempted += 1;
    const url = await serialized(async () => {
      if (Date.now() < blockedUntil || Date.now() > deadline) return undefined;
      const p = await fetchSigningParams(id, stats);
      return p ? await decodeOne(p, stats) : null;
    });
    if (url === undefined) {
      stats.attempted -= 1;
      stats.skipped += 1;
      continue;
    }
    CACHE.set(id, { url, until: Date.now() + (url ? CACHE_TTL_MS : FAIL_TTL_MS) });
    if (url) {
      it.link = url;
      if (!it.domain) it.domain = hostOf(url);
      stats.resolved += 1;
    }
  }
  if (Date.now() < blockedUntil) stats.backoff = true;
  return stats;
}

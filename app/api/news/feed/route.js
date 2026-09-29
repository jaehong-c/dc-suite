import { NextResponse } from "next/server";
import { TOPICS, topicByKey } from "@/lib/news/topics";
import { fetchTopic, knownFromSnapshot } from "@/lib/news/rss";
import { loadSnapshot } from "@/lib/news/store";

export const revalidate = 3600;
// Link resolution and article-image lookups add seconds on a cold read.
export const maxDuration = 60;

// Live reads get a short budget: whatever resolves in time gets a picture,
// the rest keep their Google link and the daily edition catches up.
const LIVE_BUDGET_MS = 20000;
const GDELT_EXTRA_MS = 20000;

async function knownLinks() {
  try {
    return knownFromSnapshot(await loadSnapshot());
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("topic");
  // ?fresh=1 bypasses the link-resolver cache and cool-off, for debugging.
  const fresh = searchParams.get("fresh") === "1";
  // ?gdelt=1 also queries GDELT, which is slow; the daily cron always does.
  const gdelt = searchParams.get("gdelt") === "1";
  const topic = key ? topicByKey(key) : null;
  if (key && !topic) {
    return NextResponse.json({ error: `Unknown topic: ${key}` }, { status: 400 });
  }

  try {
    if (topic) {
      const known = await knownLinks();
      const items = await fetchTopic(topic, { fresh, known, gdelt, deadline: Date.now() + LIVE_BUDGET_MS + (gdelt ? GDELT_EXTRA_MS : 0) });
      const withImage = items.filter((it) => it.image).length;
      const direct = items.filter((it) => !/google\.com/.test(it.link)).length;
      return NextResponse.json({
        topic: topic.key,
        fetchedAt: new Date().toISOString(),
        diagnostics: { items: items.length, direct, withImage, known: known ? known.size : 0, ...items.diagnostics },
        items,
      });
    }
    // No topic: return counts for every topic so the sidebar can show them.
    const all = await Promise.all(TOPICS.map((t) => fetchTopic(t, { deadline: Date.now() })));
    const counts = Object.fromEntries(TOPICS.map((t, i) => [t.key, all[i].length]));
    return NextResponse.json({ counts, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: `Feed fetch failed: ${err.message}` }, { status: 502 });
  }
}

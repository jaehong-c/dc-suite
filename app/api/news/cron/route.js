import { NextResponse } from "next/server";
import { TOPICS } from "@/lib/news/topics";
import { fetchTopic, knownFromSnapshot } from "@/lib/news/rss";
import { writeDigest, DIGEST_MODEL } from "@/lib/news/digest";
import { saveSnapshot, loadSnapshot } from "@/lib/news/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Budget for link resolution and image lookups across all topics. Google
// calls are serialized process-wide, so this is what bounds the run; the
// digests need the remaining time.
const RESOLVE_BUDGET_MS = 30000;

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>". A
// ?secret= query is accepted too so the job can be run by hand from a browser.
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  const { searchParams } = new URL(req.url);
  return searchParams.get("secret") === secret;
}

export async function GET(req) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  // Yesterday's edition is today's memory: headlines already resolved keep
  // their publisher link and image without another Google round-trip.
  let known = null;
  try {
    known = knownFromSnapshot(await loadSnapshot());
  } catch {
    known = null;
  }

  // Feeds first, all topics in parallel; a failed feed yields an empty topic
  // rather than failing the whole run.
  const deadline = startedAt + RESOLVE_BUDGET_MS;
  const feeds = await Promise.all(TOPICS.map((t) => fetchTopic(t, { known, deadline, gdelt: true }).catch(() => [])));

  // Then digests in parallel. A failed digest is recorded, not fatal.
  const digests = await Promise.all(
    TOPICS.map(async (t, i) => {
      const items = feeds[i];
      if (!items.length) return { digest: null, error: "No headlines" };
      try {
        return { digest: await writeDigest(t, items), error: null };
      } catch (e) {
        return { digest: null, error: e.message };
      }
    })
  );

  const snapshot = {
    generatedAt: new Date().toISOString(),
    model: DIGEST_MODEL,
    topics: Object.fromEntries(
      TOPICS.map((t, i) => [
        t.key,
        { items: feeds[i], digest: digests[i].digest, error: digests[i].error },
      ])
    ),
  };

  try {
    const url = await saveSnapshot(snapshot);
    return NextResponse.json({
      ok: true,
      generatedAt: snapshot.generatedAt,
      url,
      seconds: Math.round((Date.now() - startedAt) / 100) / 10,
      known: known ? known.size : 0,
      topics: Object.fromEntries(
        TOPICS.map((t, i) => {
          const items = feeds[i];
          const d = items.diagnostics || {};
          return [
            t.key,
            {
              items: items.length,
              direct: items.filter((it) => !/google\.com/.test(it.link)).length,
              withImage: items.filter((it) => it.image).length,
              fromKnown: d.fromKnown ?? 0,
              gdelt: d.sources?.gdelt ?? 0,
              gdeltNote: d.gdelt ? { calls: d.gdelt.calls, status: d.gdelt.status, errors: d.gdelt.errors, ms: d.gdelt.ms, sample: d.gdelt.sample } : null,
              resolved: d.resolve?.resolved ?? 0,
              backoff: d.resolve?.backoff ?? false,
              digest: Boolean(digests[i].digest),
              error: digests[i].error,
            },
          ];
        })
      ),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Save failed: ${err.message}` }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { TOPICS } from "@/lib/news/topics";
import { fetchTopic } from "@/lib/news/rss";
import { writeDigest, DIGEST_MODEL } from "@/lib/news/digest";
import { saveSnapshot } from "@/lib/news/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  // Feeds first, all topics in parallel; a failed feed yields an empty topic
  // rather than failing the whole run.
  const feeds = await Promise.all(TOPICS.map((t) => fetchTopic(t).catch(() => [])));

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
      topics: Object.fromEntries(
        TOPICS.map((t, i) => [t.key, { items: feeds[i].length, digest: Boolean(digests[i].digest), error: digests[i].error }])
      ),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Save failed: ${err.message}` }, { status: 500 });
  }
}

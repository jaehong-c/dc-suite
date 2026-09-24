import { NextResponse } from "next/server";
import { TOPICS, topicByKey } from "@/lib/news/topics";
import { fetchTopic } from "@/lib/news/rss";

export const revalidate = 3600;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("topic");
  const topic = key ? topicByKey(key) : null;
  if (key && !topic) {
    return NextResponse.json({ error: `Unknown topic: ${key}` }, { status: 400 });
  }

  try {
    if (topic) {
      const items = await fetchTopic(topic);
      return NextResponse.json({ topic: topic.key, items, fetchedAt: new Date().toISOString() });
    }
    // No topic: return counts for every topic so the sidebar can show them.
    const all = await Promise.all(TOPICS.map((t) => fetchTopic(t)));
    const counts = Object.fromEntries(TOPICS.map((t, i) => [t.key, all[i].length]));
    return NextResponse.json({ counts, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: `Feed fetch failed: ${err.message}` }, { status: 502 });
  }
}

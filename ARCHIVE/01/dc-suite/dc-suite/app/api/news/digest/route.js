import { NextResponse } from "next/server";
import { topicByKey } from "@/lib/news/topics";
import { writeDigest, DIGEST_MODEL } from "@/lib/news/digest";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = topicByKey(body?.topic);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!topic || items.length === 0) {
    return NextResponse.json({ error: "Nothing to summarize" }, { status: 400 });
  }

  try {
    const digest = await writeDigest(topic, items);
    return NextResponse.json({ digest, model: DIGEST_MODEL });
  } catch (err) {
    const status = /not configured/.test(err.message) ? 500 : 502;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// One place for the digest prompt and the Anthropic call, shared by the
// on-demand route and the daily cron.
const MODEL = "claude-sonnet-4-5";

export function buildDigestPrompt(topic, items) {
  const lines = items
    .slice(0, 25)
    .map(
      (it, i) =>
        `${i + 1}. ${it.title} (${it.source}${it.publishedAt ? `, ${it.publishedAt.slice(0, 10)}` : ""})`
    )
    .join("\n");

  return `You are writing a short market digest for a data center real estate professional. The topic is "${topic.name}" (${topic.hint}). Below are recent headlines gathered from public news feeds, newest first. You only have the headlines, not the articles, so stay at the level of what the headlines say and do not invent figures, names or outcomes that are not in them.

Headlines:
${lines}

Write three short paragraphs of plain prose, 120 to 170 words total:
1. The two or three developments that matter most this week and why, referring to headlines by number in square brackets, for example [3].
2. Any pattern across the headlines (a market, a counterparty, a policy theme) worth noticing.
3. One sentence on what to watch next.

Bold the two or three most decision-relevant phrases using **double asterisks**. No headers, no bullet lists, no preamble, no sign-off. Do not use em dashes or en dashes anywhere; use commas, periods, or parentheses instead.`;
}

export async function writeDigest(topic, items) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  if (!items.length) throw new Error("No headlines to summarize");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: buildDigestPrompt(topic, items) }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();
}

export { MODEL as DIGEST_MODEL };

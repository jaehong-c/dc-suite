import { TOPICS } from "@/lib/news/topics";

export const metadata = { title: "About DC Wire" };

export default function AboutWire() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-8">
      <div className="card" style={{ maxWidth: 800, padding: "32px 36px" }}>
        <p className="eyebrow mb-2">About</p>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
          Data center news, sorted so a deal team can read it in five minutes
        </h1>
        <p className="mt-3 text-[14px] text-[var(--ink-2)]">
          DC Wire is the reading layer of the suite. It does no analysis of its own; it keeps the
          other three tools honest about what changed in the market this week.
        </p>

        <section className="mt-8">
          <p className="eyebrow mb-2">How it works</p>
          <p className="mb-3 text-[14px] leading-relaxed text-[var(--ink-2)]">
            Each topic is a small set of news-search queries against public RSS feeds. Results are
            merged, de-duplicated by headline, limited to the last three weeks and sorted newest
            first.
          </p>
          <p className="mb-3 text-[14px] leading-relaxed text-[var(--ink-2)]">
            Every morning a scheduled job reads all six topics, asks the model for a digest of
            each, and saves the result as the daily edition. That edition is what the page shows by
            default, so it opens instantly and the feeds are read once a day rather than on every
            visit. Load live headlines if you want the feed as of right now, and Rewrite if you
            want a fresh digest of what is on screen.
          </p>
          <p className="mb-3 text-[14px] leading-relaxed text-[var(--ink-2)]">
            The model receives only the headlines and sources, never the article text, and writes
            three short paragraphs with numbered links back to the items it used. It cannot know
            more than the headlines say, which is why it is framed as a starting point rather than
            a summary of record.
          </p>
        </section>

        <section className="mt-8">
          <p className="eyebrow mb-2">Topics</p>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 8, columnGap: 16, fontSize: 14 }}>
            {TOPICS.map((t) => (
              <div key={t.key} style={{ display: "contents" }}>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                <span style={{ color: "var(--ink-2)" }}>{t.hint}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="eyebrow mb-2">Limitations</p>
          <p className="mb-3 text-[14px] leading-relaxed text-[var(--ink-2)]">
            Headlines come from whatever the public feed returns for the query, so trade press,
            local news and press releases are mixed together and some items will be off topic.
            Paywalled sources open at the paywall. Nothing here is investment advice.
          </p>
        </section>
      </div>
    </main>
  );
}

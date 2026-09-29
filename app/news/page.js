"use client";

import { useEffect, useMemo, useState } from "react";
import { TOPICS } from "@/lib/news/topics";
import Working from "@/components/shell/Working";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function faviconOf(domain) {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : null;
}

function Thumb({ item }) {
  // A publisher image can 403 or vanish after the feed was read; fall back to
  // the source mark instead of showing a broken picture.
  const [broken, setBroken] = useState(false);
  const fav = faviconOf(item.domain);
  if (item.image && !broken) {
    return (
      <span className="wire-thumb">
        <img
          src={item.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span className="wire-thumb">
      <span className="wire-thumb-mark">
        {fav ? (
          <img src={fav} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span>{(item.source || "?").slice(0, 2).toUpperCase()}</span>
        )}
      </span>
    </span>
  );
}

function fmtStamp(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Renders the digest's light markdown: paragraphs, **bold**, and [n]
// citations that link to the matching headline.
function Digest({ text, items }) {
  const paras = text.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="wire-digest-body">
      {paras.map((p, i) => (
        <p key={i}>{renderInline(p, items)}</p>
      ))}
    </div>
  );
}

function renderInline(s, items) {
  const parts = s.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const it = items[Number(m[1]) - 1];
      return it ? (
        <a key={i} href={it.link} target="_blank" rel="noreferrer" title={it.title} style={{ color: "var(--accent)" }}>
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function Wire() {
  const [topic, setTopic] = useState(TOPICS[0].key);

  // Snapshot written by the daily cron: { generatedAt, topics: { key: { items, digest } } }
  const [snapshot, setSnapshot] = useState(undefined); // undefined = not checked yet
  // Live feeds fetched on demand, keyed by topic
  const [live, setLive] = useState({});
  const [liveMode, setLiveMode] = useState({});
  // Per topic, so switching topics while one feed is still loading never
  // leaves the list stuck on "loading" or shows another topic's error.
  const [loadingBy, setLoadingBy] = useState({});
  const [errorBy, setErrorBy] = useState({});

  // On-demand digests (override the snapshot's for this session)
  const [digests, setDigests] = useState({});
  const [digesting, setDigesting] = useState(false);
  const [digestError, setDigestError] = useState(null);

  const current = useMemo(() => TOPICS.find((t) => t.key === topic), [topic]);

  // 1. Load the daily snapshot once.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/news/latest")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setSnapshot(j.snapshot || null);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const useLive = liveMode[topic] || (snapshot === null && true);
  const snapTopic = snapshot?.topics?.[topic];

  // 2. Fetch live headlines when there is no snapshot or the user asked for live.
  useEffect(() => {
    if (snapshot === undefined) return; // still checking
    if (!useLive || live[topic] || loadingBy[topic]) return;
    const key = topic;
    setLoadingBy((m) => ({ ...m, [key]: true }));
    setErrorBy((m) => ({ ...m, [key]: null }));
    fetch(`/api/news/feed?topic=${key}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Feed failed");
        return j;
      })
      .then((j) => {
        setLive((c) => ({ ...c, [key]: j }));
      })
      .catch((e) => {
        setErrorBy((m) => ({ ...m, [key]: e.message }));
      })
      .finally(() => {
        setLoadingBy((m) => ({ ...m, [key]: false }));
      });
  }, [topic, snapshot, useLive, live, loadingBy]);

  const items = useLive ? live[topic]?.items || [] : snapTopic?.items || [];
  const digestText = digests[topic] || (!useLive ? snapTopic?.digest : null);
  const stamp = useLive ? live[topic]?.fetchedAt : snapshot?.generatedAt;

  async function rewrite() {
    setDigesting(true);
    setDigestError(null);
    try {
      const r = await fetch("/api/news/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, items }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Digest failed");
      setDigests((d) => ({ ...d, [topic]: j.digest }));
    } catch (e) {
      setDigestError(e.message);
    } finally {
      setDigesting(false);
    }
  }

  const checking = snapshot === undefined;
  const loading = Boolean(loadingBy[topic]);
  const error = errorBy[topic] || null;

  return (
    <main className="wire">
      <aside className="wire-topics" aria-label="Topics">
        {TOPICS.map((t) => {
          const n = snapshot?.topics?.[t.key]?.items?.length ?? live[t.key]?.items?.length;
          return (
            <button
              key={t.key}
              type="button"
              className={`wire-topic${t.key === topic ? " is-active" : ""}`}
              onClick={() => setTopic(t.key)}
            >
              <span>{t.name}</span>
              {typeof n === "number" && <span className="wire-topic-count">{n}</span>}
            </button>
          );
        })}
      </aside>

      <section>
        <div className="wire-head">
          <div>
            <h1>{current.name}</h1>
            <p>{current.hint}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {stamp && (
              <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                {useLive ? "Live, fetched" : "Daily edition, written"} {fmtStamp(stamp)}
              </p>
            )}
            {snapshot && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ marginTop: 6 }}
                onClick={() => setLiveMode((m) => ({ ...m, [topic]: !useLive }))}
              >
                {useLive ? "Back to daily edition" : "Load live headlines"}
              </button>
            )}
          </div>
        </div>

        <div className="wire-digest">
          <div className="wire-digest-head">
            <span>Digest</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={rewrite}
              disabled={digesting || items.length === 0}
            >
              {digesting ? "Writing" : digestText ? "Rewrite" : "Write digest"}
            </button>
          </div>
          {digesting && <Working label="Reading the headlines and writing three paragraphs." />}
          {digestText && !digesting ? (
            <Digest text={digestText} items={items} />
          ) : digesting ? null : (
            <p className="wire-digest-empty">
              {digestError
                ? digestError
                : snapTopic?.error
                  ? `The daily edition could not write this digest (${snapTopic.error}). Try Rewrite.`
                  : "A three-paragraph read of the headlines below, with numbered links back to each source. Written by the model from headlines only, so treat it as a starting point, not a fact check."}
            </p>
          )}
        </div>

        <div className="wire-list">
          {(checking || loading) && (
            <div className="wire-state wire-state-busy" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <span>
                {checking ? "Opening today's edition." : `Reading the live ${current.name.toLowerCase()} feeds and looking up article images.`}{" "}
                <span style={{ color: "var(--ink-3)" }}>{checking ? "A second or two." : "Usually 5 to 20 seconds."}</span>
              </span>
            </div>
          )}
          {!checking && !loading && error && (
            <div className="wire-state">
              <b>Feed unavailable.</b> {error}
            </div>
          )}
          {!checking && !loading && !error && items.length === 0 && (
            <div className="wire-state">No headlines in the last three weeks for this topic.</div>
          )}
          {!checking &&
            !loading &&
            !error &&
            items.map((it, i) => (
              <a key={it.link} href={it.link} target="_blank" rel="noreferrer" className="wire-item">
                <span className="wire-item-date">
                  {String(i + 1).padStart(2, "0")} {"\u00B7"} {fmtDate(it.publishedAt)}
                </span>
                <Thumb item={it} />
                <span>
                  <span className="wire-item-title">{it.title}</span>
                  <span className="wire-item-source">
                    {it.image && faviconOf(it.domain) && (
                      <img src={faviconOf(it.domain)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    )}
                    <span>{it.source}</span>
                  </span>
                </span>
              </a>
            ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { BRAND, MODULES } from "@/lib/brand";

const DRIVERS = [
  { label: "Power proximity", value: "68", tone: "var(--tier-2)" },
  { label: "Market context", value: "100", tone: "var(--tier-1)" },
  { label: "Fiber", value: "100", tone: "var(--tier-1)" },
  { label: "Regulatory", value: "10", tone: "var(--tier-3)" },
];

export default function Cover() {
  return (
    <main className="cover">
      <section className="cover-hero">
        <div>
          <p className="cover-kicker">
            <b>Four tools</b>, one decision path
          </p>
          <h1 className="cover-title">
            <span>Screen the site.</span>
            <span>Price the lease.</span>
            <span>Register the risks.</span>
            <span>Read the wire.</span>
          </h1>
          <p className="cover-lede">
            {BRAND.name} takes a data center deal from a street address to an investment memo.
            Every score comes from published rules over public data, so you can trace it. The
            language model writes the memo and the news digest; it never touches a number.
          </p>
          <div className="cover-actions">
            <Link href="/site" className="cover-btn cover-btn-primary">
              Screen a site
            </Link>
            <Link href="/news" className="cover-btn cover-btn-secondary">
              Read this week&apos;s wire
            </Link>
          </div>
          <div className="cover-stats">
            {MODULES.map((m) => (
              <div key={m.key}>
                <div className="cover-stat-value">{m.stat.value}</div>
                <div className="cover-stat-label">{m.stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cover-preview" aria-label="Sample Site Screener result">
          <div className="cover-preview-head">
            <span>site screener</span>
            <span>Ashburn, Loudoun County, VA</span>
          </div>
          <div className="cover-preview-body">
            <div className="cover-preview-score">
              75<small>/100</small>
            </div>
            <div className="cover-preview-meta">
              <span>
                Recommendation <b>Strong go</b>
              </span>
              <span>
                Use profile <b>Hyperscaler-ready</b>
              </span>
              <span>
                Market <b>Northern Virginia, primary tier, rank 1</b>
              </span>
            </div>
          </div>
          <div className="cover-preview-drivers">
            {DRIVERS.map((d) => (
              <div key={d.label} className="cover-preview-driver">
                <div className="cover-preview-driver-label">{d.label}</div>
                <div className="cover-preview-driver-value" style={{ color: d.tone }}>
                  {d.value}
                </div>
              </div>
            ))}
          </div>
          <div className="cover-preview-foot">
            Key risk: regulatory 10/100. Loudoun setback rules and the Prince William rejection
            are the story here, not power.
          </div>
        </div>
      </section>

      <section className="cover-modules" aria-label="Modules">
        {MODULES.map((m) => (
          <Link key={m.key} href={m.href} className="cover-module">
            <span className="cover-module-name">{m.name}</span>
            <span className="cover-module-q">{m.question}</span>
            <span className="cover-module-blurb">{m.blurb}</span>
            <span className="cover-module-sample">
              <b>
                {m.sample.value}
                {m.sample.unit}
              </b>
              <span>{m.sample.title}</span>
            </span>
            <span className="cover-module-open">Open {m.name}</span>
          </Link>
        ))}
      </section>

      <section className="cover-method">
        <h2>How the suite works</h2>
        <div className="cover-method-grid">
          <div className="cover-method-item">
            <h3>Public data, curated</h3>
            <p>
              Substations, fiber hubs, power costs, incentives, disclosed leases and a lifecycle
              risk library are static files curated from public sources. Nothing proprietary,
              nothing scraped from behind a login.
            </p>
          </div>
          <div className="cover-method-item">
            <h3>Rule-based scoring</h3>
            <p>
              Each axis, deal metric and risk score is computed by deterministic rules with fixed
              weights. Run the same input twice and you get the same number, with the reasoning
              exposed on screen.
            </p>
          </div>
          <div className="cover-method-item">
            <h3>AI writes, never scores</h3>
            <p>
              A language model reads the finished numbers and drafts the memo or digest in the
              form an investment committee expects, including what would change the view.
            </p>
          </div>
        </div>
      </section>

      <p className="cover-author">
        Built by {BRAND.author}, Columbia GSAPP MSRED. Code for each module is public on{" "}
        <a href={BRAND.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . The three analytical tools also run standalone at their original addresses.
      </p>
    </main>
  );
}

# DC Intelligence (repo: dc-suite)

Four data center decision-support tools in one Next.js app, sharing a single design system.

| Route | Module | What it does |
|---|---|---|
| `/` | Cover | Suite overview with a live-style sample result |
| `/site` | Site Screener | Eleven-axis siting screen for any US address, map, AI memo |
| `/lease` | Lease Comparator | Disclosed data center leases normalized to $/kW/month, TCV, YOC, NPV |
| `/risk` | Risk Register | 72 lifecycle risks scored against a project profile, heat matrix, audit log |
| `/news` | DC Wire | Data center headlines by topic from public RSS feeds, optional AI digest |

Each module has its own `/about` page, reachable from the toggle in the module bar.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the two keys
npm run dev
```

## Environment variables

| Name | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | memo and digest routes | server-side only |
| `NEXT_PUBLIC_CARTO_KEY` | Site Screener map tiles | public; restrict by domain at carto.com |
| `CRON_SECRET` | DC Wire daily job | any long random string; Vercel sends it with each cron call |
| `BLOB_READ_WRITE_TOKEN` | DC Wire daily edition storage | created automatically when a Blob store is attached to the project |

Add all four to the Vercel project (Production) before the first deploy.

## DC Wire daily edition

`vercel.json` schedules `GET /api/news/cron` once a day at 11:00 UTC (7 AM New York in summer,
6 AM in winter). The job reads all six topics, writes one digest per topic with the model, and
saves the result to Vercel Blob as `dc-wire/latest.json` plus a dated copy. The page loads that
edition first; "Load live headlines" reads the feed on demand and "Rewrite" regenerates a digest
for the current session without saving it.

Run the job by hand: open `https://dc-suite.vercel.app/api/news/cron?secret=<CRON_SECRET>` in a browser.
The JSON response reports item counts and any digest errors per topic.

## Layout

```
app/
  layout.js            global shell: header, module switcher, footer, fonts
  page.js              cover page
  globals.css          shared tokens and components; risk-specific rules scoped under .app-risk
  site/ lease/ risk/ news/
    layout.js          module bar with the tool / About toggle
    page.js            the tool
    about/page.js      methodology, data, limitations
  api/site/... api/lease/... api/risk/... api/news/...
components/shell/      AppHeader, ModuleBar, AppFooter
components/site|lease|risk/
lib/brand.js           suite name, module registry (rename the suite here)
lib/site|lease|risk|news/
data/site|lease|risk/
design-system/dc-tools/MASTER.md
```

## Design system

Tokens live in `app/globals.css` and mirror `design-system/dc-tools/MASTER.md`: light only, slate
palette, navy primary, blue accent, emerald / amber / red for status, Inter for UI and IBM Plex
Mono for numbers. Do not define `--spacing-*` inside `@theme` (Tailwind v4 treats those as its own
sizing scale and `max-w-md` breaks); use `--space-*` in `:root`.

## Deployment

Folder `dc-suite`, GitHub repo `jaehong-c/dc-suite`, Vercel project `dc-suite` at https://dc-suite.vercel.app. Add that domain to the CARTO key's allowed list.

## Standalone versions

The three analytical tools also run at their original addresses (dc-screener, dc-lease, dc-risk on
Vercel). This repository is a superset; it does not replace them.

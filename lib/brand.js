// Single source of truth for the suite identity. Rename here and every
// header, footer, title and cover page follows.
export const BRAND = {
  name: "DC Intelligence",
  short: "DCI",
  tagline: "Decision support for data center development",
  author: "Jae Chung",
  year: 2026,
  github: "https://github.com/jaehong-c",
};

// Module order is the deal flow: pick the site, price the lease, manage
// delivery risk, keep watching the market.
export const MODULES = [
  {
    key: "site",
    href: "/site",
    name: "Site Screener",
    nav: "Site",
    verb: "Screen",
    question: "Where should it be built?",
    role: "Eleven-axis siting screen for any US address",
    blurb:
      "Geocodes an address, finds the nearest data center market and scores eleven siting axes, from substation proximity to regulatory risk, with a map and an investment memo.",
    stat: { value: "11", label: "siting axes" },
    tags: ["Eleven axes", "Substation and fiber map", "AI memo"],
    sample: { title: "Ashburn, Loudoun County, VA", value: "75", unit: "/100", note: "Strong go" },
    repo: "https://github.com/jaehong-c/dc-screener",
    standalone: "https://dc-screener.vercel.app",
  },
  {
    key: "lease",
    href: "/lease",
    name: "Lease Comparator",
    nav: "Lease",
    verb: "Compare",
    question: "What is the lease worth?",
    role: "Side-by-side economics for disclosed data center leases",
    blurb:
      "Normalizes publicly disclosed leases to $/kW/month, total contract value, yield on cost and NPV, then ranks structure and counterparty credit.",
    stat: { value: "$/kW", label: "normalized rent" },
    tags: ["$/kW/month", "Yield on cost", "NPV and credit"],
    sample: { title: "WULF / Anthropic, Justified Data Campus", value: "$197", unit: "/kW/mo", note: "Stronger" },
    repo: "https://github.com/jaehong-c/dc-lease",
    standalone: "https://dc-lease.vercel.app",
  },
  {
    key: "risk",
    href: "/risk",
    name: "Risk Register",
    nav: "Risk",
    verb: "Register",
    question: "What can derail delivery?",
    role: "Lifecycle risk register for a development project",
    blurb:
      "Scores 72 lifecycle risks against a project profile, from interconnection queue to commissioning, with a heat matrix, reviewer overrides and an audit log.",
    stat: { value: "72", label: "lifecycle risks" },
    tags: ["72 risks", "Heat matrix", "Audit log"],
    sample: { title: "Permian Ridge Campus, TX, 500 MW", value: "13.9", unit: "/25", note: "Elevated" },
    repo: "https://github.com/jaehong-c/dc-risk",
    standalone: "https://dc-risk.vercel.app",
  },
  {
    key: "news",
    href: "/news",
    name: "DC Wire",
    nav: "Wire",
    verb: "Read",
    question: "What changed this week?",
    role: "Data center news, sorted by topic",
    blurb:
      "Pulls the latest headlines on deals, power, technology and policy from public news feeds, groups them by topic and drafts a short digest with links back to the sources.",
    stat: { value: "6", label: "topics tracked" },
    tags: ["6 topics", "Daily digest", "Source links"],
    sample: { title: "Recent deals, power and grid, policy", value: "Today", unit: "", note: "Refreshed hourly" },
    repo: null,
    standalone: null,
  },
];

export function moduleByKey(key) {
  return MODULES.find((m) => m.key === key);
}

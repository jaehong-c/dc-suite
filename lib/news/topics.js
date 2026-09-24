// Topic definitions for DC Wire. Each topic is a set of news-search queries;
// results are merged, de-duplicated and sorted newest first. Editing the
// queries here is the only tuning the module needs.
export const TOPICS = [
  {
    key: "deals",
    name: "Recent deals",
    hint: "Leases, acquisitions, joint ventures, financings",
    queries: [
      '"data center" lease signed',
      '"data center" acquisition OR "joint venture"',
      '"data center" financing OR "credit facility" OR bond',
    ],
  },
  {
    key: "power",
    name: "Power and grid",
    hint: "Interconnection, utilities, on-site generation, nuclear",
    queries: [
      '"data center" interconnection OR substation OR utility',
      '"data center" "power purchase" OR nuclear OR "gas turbine"',
    ],
  },
  {
    key: "tech",
    name: "Technology",
    hint: "Chips, liquid cooling, density, AI infrastructure",
    queries: [
      '"data center" GPU OR "liquid cooling" OR "rack density"',
      '"AI data center" chips OR Nvidia OR "compute"',
    ],
  },
  {
    key: "policy",
    name: "Policy and permitting",
    hint: "Zoning, moratoria, tax incentives, state legislation",
    queries: [
      '"data center" zoning OR moratorium OR "county board"',
      '"data center" "tax exemption" OR legislation OR permit',
    ],
  },
  {
    key: "markets",
    name: "Markets",
    hint: "Northern Virginia, Texas, Arizona, Ohio, Georgia and emerging markets",
    queries: [
      '"data center" "Northern Virginia" OR Loudoun OR "Prince William"',
      '"data center" Texas OR Arizona OR Ohio OR Georgia campus',
    ],
  },
  {
    key: "apac",
    name: "Asia Pacific",
    hint: "Korea, Japan, Singapore, Malaysia, Australia",
    queries: [
      '"data center" Korea OR Seoul',
      '"data center" Japan OR Singapore OR Malaysia OR Australia',
    ],
  },
];

export function topicByKey(key) {
  return TOPICS.find((t) => t.key === key);
}

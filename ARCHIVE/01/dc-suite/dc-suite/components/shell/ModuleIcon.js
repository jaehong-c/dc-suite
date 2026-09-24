// One line icon per module, drawn to match the brand mark: 16px grid,
// 1.6px rounded strokes, currentColor so it inverts on the active state.
//   site  : crosshair, a point being located and screened
//   lease : dollar, the economics of the deal
//   risk  : warning triangle, what could go wrong
//   news  : broadcast waves, the wire
const PATHS = {
  site: (
    <>
      <circle cx="8" cy="8" r="4.75" />
      <path d="M8 1.25v2.25M8 12.5v2.25M1.25 8H3.5M12.5 8h2.25" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  lease: (
    <>
      <path d="M10.6 5.4c0-1.35-1.15-2.2-2.6-2.2S5.4 4.05 5.4 5.25c0 1.45 1.3 1.95 2.6 2.35s2.6 1 2.6 2.55c0 1.3-1.15 2.2-2.6 2.2S5.4 11.5 5.4 10.35" />
      <path d="M8 1.4v1.8M8 12.35v2.25" />
    </>
  ),
  risk: (
    <>
      <path d="M7.13 2.6a1 1 0 0 1 1.74 0l5.3 9.4a1 1 0 0 1-.87 1.5H2.7a1 1 0 0 1-.87-1.5l5.3-9.4Z" />
      <path d="M8 6.25v3" />
      <circle cx="8" cy="11.35" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  news: (
    <>
      <circle cx="8" cy="10.25" r="1.4" fill="currentColor" stroke="none" />
      <path d="M8 11.5v3" />
      <path d="M4.85 7.1a4.45 4.45 0 0 1 6.3 0" />
      <path d="M2.25 4.5a8.15 8.15 0 0 1 11.5 0" />
    </>
  ),
};

export default function ModuleIcon({ moduleKey, size = 15, style, className }) {
  const body = PATHS[moduleKey];
  if (!body) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, ...style }}
    >
      {body}
    </svg>
  );
}

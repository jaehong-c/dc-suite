import Link from "next/link";
import { BRAND, MODULES } from "@/lib/brand";

export default function AppFooter() {
  return (
    <footer className="shell-footer">
      <div className="shell-wrap shell-footer-row">
        <div className="shell-footer-left">
          <span className="shell-footer-brand">{BRAND.name}</span>
          <span className="shell-footer-modules">
            {MODULES.map((m, i) => (
              <span key={m.key}>
                {i > 0 && <span aria-hidden="true"> / </span>}
                <Link href={m.href}>{m.name}</Link>
              </span>
            ))}
          </span>
        </div>
        <div className="shell-footer-right">
          <span>Public data, rule-based scoring; AI writes the memo, never the score.</span>
          <span>
            {"\u00A9"} {BRAND.year} {BRAND.author}
          </span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, MODULES } from "@/lib/brand";
import ModuleIcon from "@/components/shell/ModuleIcon";

const homeStyle = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  height: 30,
  padding: "0 12px",
  marginRight: 8,
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: active ? 600 : 500,
  color: active ? "var(--ink)" : "var(--ink-2)",
  background: active ? "var(--fill)" : "transparent",
  textDecoration: "none",
  whiteSpace: "nowrap",
});

export default function AppHeader() {
  const path = usePathname();
  const onHome = path === "/";

  return (
    <header className="shell-header">
      <div className="shell-wrap shell-header-row">
        <Link href="/" className="shell-brand" aria-label={`${BRAND.name} home`}>
          <span className="shell-brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="shell-brand-name">{BRAND.name}</span>
        </Link>

        <nav className="shell-nav" aria-label="Suite" style={{ display: "flex", alignItems: "center" }}>
          <Link href="/" style={homeStyle(onHome)} aria-current={onHome ? "page" : undefined}>
            Home
          </Link>
          <div className="shell-modules">
            {MODULES.map((m) => {
              const active = path === m.href || path.startsWith(m.href + "/");
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className={`shell-module${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  style={{ gap: 7 }}
                >
                  <ModuleIcon moduleKey={m.key} size={14} />
                  <span className="shell-module-long">{m.name}</span>
                  <span className="shell-module-short">{m.nav}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}

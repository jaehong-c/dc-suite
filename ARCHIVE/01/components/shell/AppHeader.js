"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, MODULES } from "@/lib/brand";

export default function AppHeader() {
  const path = usePathname();

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

        <nav className="shell-modules" aria-label="Modules">
          {MODULES.map((m) => {
            const active = path === m.href || path.startsWith(m.href + "/");
            return (
              <Link
                key={m.key}
                href={m.href}
                className={`shell-module${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="shell-module-long">{m.name}</span>
                <span className="shell-module-short">{m.nav}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

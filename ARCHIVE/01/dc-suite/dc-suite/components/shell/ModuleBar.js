"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleByKey } from "@/lib/brand";
import ModuleIcon from "@/components/shell/ModuleIcon";

// Sits under the global header inside each module. Left: the module's own
// icon, name and role, so each tool keeps its identity. Right: a two-position
// toggle between the tool itself and its About page.
export default function ModuleBar({ moduleKey, right }) {
  const m = moduleByKey(moduleKey);
  const path = usePathname();
  const onAbout = path === `${m.href}/about`;

  return (
    <div className="module-bar">
      <div className="shell-wrap module-bar-row">
        <div className="module-bar-id">
          <Link
            href={m.href}
            className="module-bar-name"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--ink)",
                color: "#fff",
              }}
            >
              <ModuleIcon moduleKey={m.key} size={14} />
            </span>
            {m.name}
          </Link>
          <span className="module-bar-role">{m.role}</span>
        </div>

        <div className="module-bar-right">
          {right}
          <div className="module-toggle" role="tablist" aria-label={`${m.name} view`}>
            <Link
              href={m.href}
              role="tab"
              aria-selected={!onAbout}
              className={`module-toggle-item${!onAbout ? " is-active" : ""}`}
            >
              {m.verb}
            </Link>
            <Link
              href={`${m.href}/about`}
              role="tab"
              aria-selected={onAbout}
              className={`module-toggle-item${onAbout ? " is-active" : ""}`}
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

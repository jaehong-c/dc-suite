"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The suite header is sticky. Next.js keeps the scroll position on navigation
// when the new segment's top edge is technically inside the viewport, which
// hides the module bar under the header. Always start a new route at the top.
export default function ScrollToTop() {
  const path = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path]);
  return null;
}

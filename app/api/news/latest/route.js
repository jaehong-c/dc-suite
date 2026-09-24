import { NextResponse } from "next/server";
import { loadSnapshot } from "@/lib/news/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await loadSnapshot();
    if (!snapshot) return NextResponse.json({ snapshot: null });
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json({ snapshot: null, error: err.message });
  }
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-user";
import { hasSupabase } from "@/lib/env";
import { ensureWorkspace } from "@/lib/seed";
import { loadWorkspace } from "@/lib/workspace";

export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  try {
    await ensureWorkspace(supabase, user);
    const workspace = await loadWorkspace(supabase, user);
    return NextResponse.json({ ok: true, mode: "live", ...workspace });
  } catch {
    return NextResponse.json({ ok: false, error: "workspace" }, { status: 500 });
  }
}

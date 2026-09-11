import { NextResponse } from "next/server";
import { emailAllowed } from "@/lib/env";
import { ensureWorkspace } from "@/lib/seed";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user || !emailAllowed(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  try {
    await ensureWorkspace(supabase, data.user);
  } catch {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  return NextResponse.redirect(`${origin}/?signedin=1`);
}

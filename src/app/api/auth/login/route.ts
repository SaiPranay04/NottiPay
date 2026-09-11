import { NextResponse } from "next/server";
import { z } from "zod";
import { emailAllowed, hasSupabase } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const Body = z.object({
  email: z.string().email().max(200),
});

export async function POST(req: Request) {
  if (!hasSupabase()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !emailAllowed(parsed.data.email)) {
    return NextResponse.json({ ok: false, error: "not_allowed" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email.trim().toLowerCase(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

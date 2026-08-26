import { NextResponse } from "next/server";
import { z } from "zod";
import { takeConfirmToken } from "@/lib/confirm-token";

const Body = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const taken = takeConfirmToken(parsed.data.token);
  if (!taken.ok) {
    return NextResponse.json({ ok: false, error: "expired_or_used" }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    applied: taken.payload,
    note: "Demo: ledger writes stay in the browser until Supabase env is set.",
  });
}

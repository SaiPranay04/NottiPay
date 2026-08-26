import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  amount_minor: z.number().int().positive(),
  currency: z.enum(["GBP", "INR"]).default("GBP"),
  account_id: z.string(),
  category: z.string(),
  merchant: z.string(),
  note: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({ ok: true, items: [], mode: "demo" });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    transaction: { id: `t_${Date.now()}`, ...parsed.data },
    note: "Demo write. Connect Supabase to persist.",
  });
}

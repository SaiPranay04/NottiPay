import { NextResponse } from "next/server";
import { z } from "zod";
import { convertGbpToInr, convertInrToGbp, poundsToMinor } from "@/lib/money";
import { getFxCache } from "@/lib/fx";

const Body = z.object({
  amount: z.number(),
  from: z.enum(["GBP", "INR"]),
  markup_pct: z.number().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const fx = getFxCache();
  let rate = fx.gbp_in_inr;
  if (parsed.data.markup_pct) {
    rate = rate * (1 - parsed.data.markup_pct / 100);
  }
  const minor = poundsToMinor(parsed.data.amount);
  const out =
    parsed.data.from === "GBP" ? convertGbpToInr(minor, rate) : convertInrToGbp(minor, rate);
  return NextResponse.json({ ok: true, ...fx, rate_used: rate, result_minor: out });
}

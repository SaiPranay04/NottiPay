import { NextResponse } from "next/server";
import { cashStack, dailySafe } from "@/lib/cash-stack";
import { convertGbpToInr } from "@/lib/money";
import { getFxCache } from "@/lib/fx";

export async function GET() {
  const fx = getFxCache();
  const stack = cashStack({
    gbpCash: 29640,
    reserved: 12000,
    pacedEssentials: 3400,
    emergencyFloor: 1000,
  });
  return NextResponse.json({
    ...stack,
    dailySafe: dailySafe(stack.safeThisWeek, 4),
    inr: convertGbpToInr(stack.safeThisWeek, fx.gbp_in_inr),
    fx,
    mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "demo",
  });
}

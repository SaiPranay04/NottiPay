import { NextResponse } from "next/server";
import { fetchFx } from "@/lib/fx";

export async function GET() {
  const fx = await fetchFx();
  return NextResponse.json(fx);
}

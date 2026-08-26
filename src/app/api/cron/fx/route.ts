import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/env";
import { fetchFx } from "@/lib/fx";

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const fx = await fetchFx();
  return NextResponse.json({ ok: true, fx });
}

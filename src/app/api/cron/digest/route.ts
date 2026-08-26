import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/env";

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: true,
      skipped: "RESEND_API_KEY missing — digest not sent",
    });
  }
  return NextResponse.json({ ok: true, queued: true });
}

import { NextResponse } from "next/server";
import { getFxCache } from "@/lib/fx";

export async function GET() {
  return NextResponse.json(getFxCache());
}

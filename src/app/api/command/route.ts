import { NextResponse } from "next/server";
import { z } from "zod";
import { parseWithFallback } from "@/lib/ai";
import { issueConfirmToken } from "@/lib/confirm-token";

const Body = z.object({ text: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const result = await parseWithFallback(parsed.data.text);
  if (!result.ok) {
    return NextResponse.json(result);
  }
  const token =
    result.kind === "question" ? null : issueConfirmToken({ kind: result.kind, draft: result.draft, echo: result.echo });
  return NextResponse.json({ ...result, token });
}

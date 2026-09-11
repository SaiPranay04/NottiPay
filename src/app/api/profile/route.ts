import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth-user";

const Patch = z.object({
  confirm_threshold_minor: z.number().int().nonnegative().optional(),
  emergency_floor_minor: z.number().int().nonnegative().optional(),
  inr_display: z.enum(["always", "tap", "never"]).optional(),
});

export async function PATCH(req: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth-user";
import { mapAccount } from "@/lib/workspace";

const Patch = z.object({
  id: z.string().uuid(),
  balance_minor: z.number().int().optional(),
  include_in_safe_spend: z.boolean().optional(),
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

  const patch: Record<string, unknown> = {};
  if (parsed.data.balance_minor != null) patch.balance_minor = parsed.data.balance_minor;
  if (parsed.data.include_in_safe_spend != null) {
    patch.include_in_safe_spend = parsed.data.include_in_safe_spend;
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, account: mapAccount(data) });
}

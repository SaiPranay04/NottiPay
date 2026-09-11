import { NextResponse } from "next/server";
import { z } from "zod";
import { matchAccount } from "@/lib/account-alias";
import { currentUser } from "@/lib/auth-user";
import { getFxCache } from "@/lib/fx";
import { londonToday } from "@/lib/london-date";
import { convertGbpToInr } from "@/lib/money";
import { mapAccount, mapTransaction } from "@/lib/workspace";

const Create = z.object({
  amount_minor: z.number().int().positive(),
  currency: z.enum(["GBP", "INR"]).optional(),
  account_id: z.string().min(1),
  category: z.string().min(1),
  merchant: z.string().min(1),
  note: z.string().optional(),
  occurred_at: z.string().optional(),
});

const Patch = z.object({
  id: z.string().uuid(),
  amount_minor: z.number().int().positive().optional(),
  merchant: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  note: z.string().optional(),
  account_id: z.string().min(1).optional(),
});

async function loadAccounts(supabase: NonNullable<Awaited<ReturnType<typeof currentUser>>["supabase"]>, userId: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false);
  if (error) throw error;
  return data ?? [];
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: true, items: [], mode: "demo" });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mode: "live",
    items: (data ?? []).map(mapTransaction),
  });
}

export async function POST(req: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const accounts = await loadAccounts(supabase, user.id);
  const account = matchAccount(accounts, parsed.data.account_id);
  if (!account) {
    return NextResponse.json({ ok: false, error: "account" }, { status: 400 });
  }

  const fx = getFxCache();
  const amount = parsed.data.amount_minor;
  const currency = parsed.data.currency || account.currency;
  const occurred = parsed.data.occurred_at || londonToday();
  const amountInr =
    currency === "GBP" ? convertGbpToInr(amount, fx.gbp_in_inr) : amount;

  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      status: "posted",
      account_id: account.id,
      amount_minor: amount,
      currency,
      rate_used: fx.gbp_in_inr,
      rate_source: fx.source,
      amount_inr_minor: amountInr,
      category_id: parsed.data.category,
      merchant: parsed.data.merchant,
      note: parsed.data.note || "",
      occurred_at: `${occurred}T12:00:00.000Z`,
      created_via: "command",
    })
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  const { error: balanceError } = await supabase
    .from("accounts")
    .update({ balance_minor: account.balance_minor - amount })
    .eq("id", account.id)
    .eq("user_id", user.id);

  if (balanceError) {
    await supabase.from("transactions").delete().eq("id", row.id).eq("user_id", user.id);
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  const nextAccounts = await loadAccounts(supabase, user.id);
  return NextResponse.json({
    ok: true,
    mode: "live",
    transaction: mapTransaction(row),
    accounts: nextAccounts.map(mapAccount),
  });
}

export async function PATCH(req: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .single();

  if (readError || !existing) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  const accounts = await loadAccounts(supabase, user.id);
  const currentAccount = accounts.find((account) => account.id === existing.account_id);
  const nextAccount = parsed.data.account_id
    ? matchAccount(accounts, parsed.data.account_id)
    : currentAccount;

  if (!currentAccount || !nextAccount) {
    return NextResponse.json({ ok: false, error: "account" }, { status: 400 });
  }

  const nextAmount = parsed.data.amount_minor ?? existing.amount_minor;
  const patch: Record<string, unknown> = {};
  if (parsed.data.merchant != null) patch.merchant = parsed.data.merchant;
  if (parsed.data.category != null) patch.category_id = parsed.data.category;
  if (parsed.data.note != null) patch.note = parsed.data.note;
  if (parsed.data.amount_minor != null) patch.amount_minor = parsed.data.amount_minor;
  if (nextAccount.id !== existing.account_id) patch.account_id = nextAccount.id;

  const { data: row, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", existing.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  if (nextAccount.id === currentAccount.id) {
    const delta = nextAmount - existing.amount_minor;
    if (delta !== 0) {
      await supabase
        .from("accounts")
        .update({ balance_minor: currentAccount.balance_minor - delta })
        .eq("id", currentAccount.id)
        .eq("user_id", user.id);
    }
  } else {
    await supabase
      .from("accounts")
      .update({ balance_minor: currentAccount.balance_minor + existing.amount_minor })
      .eq("id", currentAccount.id)
      .eq("user_id", user.id);
    await supabase
      .from("accounts")
      .update({ balance_minor: nextAccount.balance_minor - nextAmount })
      .eq("id", nextAccount.id)
      .eq("user_id", user.id);
  }

  const nextAccounts = await loadAccounts(supabase, user.id);
  return NextResponse.json({
    ok: true,
    mode: "live",
    transaction: mapTransaction(row),
    accounts: nextAccounts.map(mapAccount),
  });
}

export async function DELETE(req: Request) {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { data: existing, error: readError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (readError || !existing) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  const accounts = await loadAccounts(supabase, user.id);
  const account = accounts.find((row) => row.id === existing.account_id);

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  if (account) {
    await supabase
      .from("accounts")
      .update({ balance_minor: account.balance_minor + existing.amount_minor })
      .eq("id", account.id)
      .eq("user_id", user.id);
  }

  const nextAccounts = await loadAccounts(supabase, user.id);
  return NextResponse.json({
    ok: true,
    mode: "live",
    accounts: nextAccounts.map(mapAccount),
  });
}

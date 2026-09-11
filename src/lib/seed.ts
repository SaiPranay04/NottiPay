import type { SupabaseClient } from "@supabase/supabase-js";
import { londonToday } from "./london-date";

const CATEGORIES = [
  { id: "groceries", name: "Groceries", essential: true },
  { id: "transport", name: "Transport", essential: true },
  { id: "phone", name: "Phone", essential: true },
  { id: "laundry", name: "Laundry", essential: true },
  { id: "eatingout", name: "Eating out", essential: false },
  { id: "setup", name: "Setting up", essential: false },
  { id: "university", name: "University", essential: false },
  { id: "misc", name: "Misc", essential: false },
];

const BUDGETS: { category_id: string; limit_minor: number }[] = [
  { category_id: "groceries", limit_minor: 12000 },
  { category_id: "transport", limit_minor: 6000 },
  { category_id: "phone", limit_minor: 1200 },
  { category_id: "laundry", limit_minor: 1500 },
  { category_id: "eatingout", limit_minor: 4000 },
  { category_id: "setup", limit_minor: 15000 },
  { category_id: "university", limit_minor: 3000 },
  { category_id: "misc", limit_minor: 3000 },
];

const ACCOUNTS = [
  { name: "Cash", kind: "cash", currency: "GBP", include_in_safe_spend: true },
  { name: "Forex card", kind: "card", currency: "GBP", include_in_safe_spend: true },
  { name: "UK bank", kind: "bank", currency: "GBP", include_in_safe_spend: true },
  { name: "Indian bank", kind: "bank", currency: "INR", include_in_safe_spend: false },
  { name: "Cash (INR)", kind: "cash", currency: "INR", include_in_safe_spend: false },
];

export async function ensureWorkspace(supabase: SupabaseClient, user: { id: string; email?: string }) {
  const email = user.email ?? "";
  const { data: existing, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (existing) return;

  const payday = new Date(`${londonToday()}T12:00:00Z`);
  payday.setUTCDate(payday.getUTCDate() + 21);

  const { error: insertProfile } = await supabase.from("profiles").insert({
    user_id: user.id,
    email,
    timezone: "Europe/London",
    inr_display: "always",
    confirm_threshold_minor: 1500,
    emergency_floor_minor: 1000,
    next_payday: payday.toISOString().slice(0, 10),
  });
  if (insertProfile) throw insertProfile;

  const { error: insertAccounts } = await supabase.from("accounts").insert(
    ACCOUNTS.map((account) => ({ ...account, user_id: user.id, balance_minor: 0 })),
  );
  if (insertAccounts) throw insertAccounts;

  const { error: insertCategories } = await supabase.from("categories").insert(
    CATEGORIES.map((category) => ({ ...category, user_id: user.id })),
  );
  if (insertCategories) throw insertCategories;

  const { error: insertBudgets } = await supabase.from("budgets").insert(
    BUDGETS.map((budget) => ({ ...budget, user_id: user.id })),
  );
  if (insertBudgets) throw insertBudgets;

  const { error: insertLoan } = await supabase.from("loans").insert({
    user_id: user.id,
    name: "Canara Bank",
    sanctioned_minor: 220_000_000,
    currency: "INR",
    annual_rate: 9.85,
    start_date: londonToday(),
  });
  if (insertLoan) throw insertLoan;
}

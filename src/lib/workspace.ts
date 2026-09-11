import type { SupabaseClient } from "@supabase/supabase-js";
import { londonToday, weekEndingSunday } from "./london-date";

type AccountRow = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balance_minor: number;
  include_in_safe_spend: boolean;
};

type TxRow = {
  id: string;
  type: string;
  account_id: string;
  amount_minor: number;
  category_id: string | null;
  merchant: string | null;
  note: string | null;
  occurred_at: string;
};

type CommitmentRow = {
  id: string;
  kind: string;
  title: string;
  amount_minor: number;
  currency: string;
  due_date: string;
  recurrence: string;
  status: string;
};

type LoanRow = {
  id: string;
  name: string;
  sanctioned_minor: number;
  annual_rate: number;
  moratorium_end: string | null;
};

type LoanEventRow = {
  id: string;
  loan_id: string;
  kind: string;
  amount_minor: number;
  occurred_at: string;
  note: string | null;
};

export function mapAccount(row: AccountRow) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    currency: row.currency,
    balance: row.balance_minor,
    includeInSafeSpend: row.include_in_safe_spend,
    note: "",
  };
}

export function mapTransaction(row: TxRow) {
  return {
    id: row.id,
    date: row.occurred_at.slice(0, 10),
    merchant: row.merchant || "Unlabelled",
    category: row.category_id || "misc",
    accountId: row.account_id,
    amount: row.amount_minor,
    type: row.type,
    note: row.note || "",
  };
}

export async function loadWorkspace(supabase: SupabaseClient, user: { id: string; email?: string }) {
  const today = londonToday();
  const [
    profileRes,
    accountsRes,
    categoriesRes,
    budgetsRes,
    txRes,
    commitmentsRes,
    loansRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("archived", false).order("created_at"),
    supabase.from("categories").select("*").eq("user_id", user.id),
    supabase.from("budgets").select("*").eq("user_id", user.id),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }),
    supabase.from("commitments").select("*").eq("user_id", user.id).order("due_date"),
    supabase.from("loans").select("*").eq("user_id", user.id).limit(1),
    supabase.from("loan_events").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }),
  ]);

  const firstError =
    profileRes.error ||
    accountsRes.error ||
    categoriesRes.error ||
    budgetsRes.error ||
    txRes.error ||
    commitmentsRes.error ||
    loansRes.error ||
    eventsRes.error;
  if (firstError) throw firstError;

  const profile = profileRes.data;
  const accounts = (accountsRes.data ?? []) as AccountRow[];
  const categories = categoriesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const transactions = (txRes.data ?? []) as TxRow[];
  const commitments = (commitmentsRes.data ?? []) as CommitmentRow[];
  const loanRow = ((loansRes.data ?? []) as LoanRow[])[0];
  const events = (eventsRes.data ?? []) as LoanEventRow[];

  const nextPayday = profile?.next_payday || today;

  return {
    email: user.email ?? profile?.email ?? "",
    today,
    profile: {
      name: (user.email ?? "You").split("@")[0] || "You",
      email: user.email ?? profile?.email ?? "",
      city: "Nottingham",
      course: "",
      tz: profile?.timezone || "Europe/London",
    },
    settings: {
      inrDisplay: profile?.inr_display || "always",
      confirmThreshold: profile?.confirm_threshold_minor ?? 1500,
      emergencyFloor: profile?.emergency_floor_minor ?? 1000,
      pacedEssentials: 0,
      nextPayday,
      weekEndsOn: weekEndingSunday(today),
    },
    accounts: accounts.map(mapAccount),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      essential: category.essential,
    })),
    budgets: budgets.map((budget) => ({
      categoryId: budget.category_id,
      limit: budget.limit_minor,
    })),
    transactions: transactions.map(mapTransaction),
    commitments: commitments.map((row) => ({
      id: row.id,
      name: row.title,
      kind: row.kind,
      amount: row.amount_minor,
      currency: row.currency,
      dueDate: row.due_date,
      recurrence: row.recurrence,
      reserved: row.currency === "GBP" && row.due_date <= nextPayday && row.status !== "paid",
      status: row.status === "paid" ? "paid" : "unpaid",
    })),
    loan: loanRow
      ? {
          id: loanRow.id,
          lender: loanRow.name,
          ref: "",
          sanctioned: loanRow.sanctioned_minor,
          ratePct: Number(loanRow.annual_rate),
          moratorium: loanRow.moratorium_end ? `Until ${loanRow.moratorium_end}` : "Course + 6 months",
          calcDate: today,
          disbursements: events
            .filter((event) => event.loan_id === loanRow.id && event.kind === "disbursement")
            .map((event) => ({
              id: event.id,
              date: event.occurred_at,
              amount: event.amount_minor,
              purpose: event.note || "General",
              rateUsed: null,
            })),
        }
      : null,
  };
}

import { invertRate } from "./money";
import { supabaseAdmin } from "./supabase";

export type FxLatest = {
  gbp_in_inr: number;
  inr_in_gbp: number;
  as_of: string;
  source: string;
  next_check?: string;
};

const FALLBACK: FxLatest = {
  gbp_in_inr: 110.3125,
  inr_in_gbp: invertRate(110.3125),
  as_of: "2026-08-27T16:00:00.000Z",
  source: "manual",
};

let cache: FxLatest = FALLBACK;

export function getFxCache(): FxLatest {
  return withNextCheck(cache);
}

export function setFxCache(next: FxLatest) {
  cache = next;
}

type Source = {
  name: string;
  url: string;
  pick: (j: Record<string, unknown>) => { rate: number; asOf: string } | null;
};

const SOURCES: Source[] = [
  {
    name: "frankfurter",
    url: "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR",
    pick: (j) => {
      const rates = j.rates as { INR?: number } | undefined;
      if (!rates?.INR || !j.date) return null;
      return { rate: rates.INR, asOf: `${j.date}T16:00:00.000Z` };
    },
  },
  {
    name: "er-api",
    url: "https://open.er-api.com/v6/latest/GBP",
    pick: (j) => {
      const rates = j.rates as { INR?: number } | undefined;
      if (!rates?.INR) return null;
      return { rate: rates.INR, asOf: String(j.time_last_update_utc ?? new Date().toISOString()) };
    },
  },
];

function nextCheckIso(from = new Date()): string {
  const utc = new Date(from);
  const y = utc.getUTCFullYear();
  const m = utc.getUTCMonth();
  const d = utc.getUTCDate();
  const morning = Date.UTC(y, m, d, 6, 45);
  const evening = Date.UTC(y, m, d, 16, 45);
  const now = utc.getTime();
  if (now < morning) return new Date(morning).toISOString();
  if (now < evening) return new Date(evening).toISOString();
  return new Date(Date.UTC(y, m, d + 1, 6, 45)).toISOString();
}

function withNextCheck(row: FxLatest): FxLatest {
  return { ...row, next_check: row.next_check ?? nextCheckIso() };
}

function toLatest(rate: number, asOf: string, source: string): FxLatest {
  return {
    gbp_in_inr: rate,
    inr_in_gbp: invertRate(rate),
    as_of: asOf,
    source,
  };
}

async function loadStoredFx(): Promise<FxLatest | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("fx_rates")
    .select("rate, as_of, source")
    .eq("base", "GBP")
    .eq("quote", "INR")
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.rate) return null;
  return toLatest(Number(data.rate), data.as_of, data.source);
}

async function persistFx(row: FxLatest) {
  const admin = supabaseAdmin();
  if (!admin) return;
  await admin.from("fx_rates").upsert(
    {
      user_id: null,
      base: "GBP",
      quote: "INR",
      rate: row.gbp_in_inr,
      source: row.source,
      as_of: row.as_of,
    },
    { onConflict: "base,quote,source,as_of", ignoreDuplicates: true },
  );
}

export async function fetchFx(): Promise<FxLatest> {
  if (cache.source === "manual") {
    const stored = await loadStoredFx();
    if (stored) setFxCache(stored);
  }

  const last = cache;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const picked = src.pick(json);
      if (!picked || !Number.isFinite(picked.rate) || picked.rate <= 0) continue;
      const jump = Math.abs(picked.rate - last.gbp_in_inr) / last.gbp_in_inr;
      if (last.source !== "manual" && jump > 0.05) continue;
      const next = toLatest(picked.rate, picked.asOf, src.name);
      setFxCache(next);
      await persistFx(next);
      return withNextCheck(next);
    } catch {
      continue;
    }
  }
  return withNextCheck(cache);
}

import { invertRate } from "./money";

export type FxLatest = {
  gbp_in_inr: number;
  inr_in_gbp: number;
  as_of: string;
  source: string;
};

const FALLBACK: FxLatest = {
  gbp_in_inr: 110.3125,
  inr_in_gbp: invertRate(110.3125),
  as_of: "2026-08-27T16:00:00.000Z",
  source: "manual",
};

let cache: FxLatest = FALLBACK;

export function getFxCache(): FxLatest {
  return cache;
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

export async function fetchFx(): Promise<FxLatest> {
  const last = cache.gbp_in_inr;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      const picked = src.pick(json);
      if (!picked || !Number.isFinite(picked.rate) || picked.rate <= 0) continue;
      if (last && Math.abs(picked.rate - last) / last > 0.05) continue;
      const next: FxLatest = {
        gbp_in_inr: picked.rate,
        inr_in_gbp: invertRate(picked.rate),
        as_of: picked.asOf,
        source: src.name,
      };
      setFxCache(next);
      return next;
    } catch {
      continue;
    }
  }
  return cache;
}

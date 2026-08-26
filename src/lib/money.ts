/** Integer minor units. £7.60 → 760. Never use floats for money. */

export function roundHalfUp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n >= 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

export function poundsToMinor(pounds: number): number {
  return roundHalfUp(pounds * 100);
}

export function convertGbpToInr(gbpMinor: number, rate: number): number {
  return roundHalfUp(gbpMinor * rate);
}

export function convertInrToGbp(inrMinor: number, rate: number): number {
  if (rate === 0) return 0;
  return roundHalfUp(inrMinor / rate);
}

export function invertRate(gbpInInr: number): number {
  if (gbpInInr === 0) return 0;
  return 1 / gbpInInr;
}

export function expectedGrossMinor(
  workedMinutes: number,
  hourlyRateMinor: number,
): number {
  return roundHalfUp((workedMinutes / 60) * hourlyRateMinor);
}

export function hoursOnlyMinutes(hours: number): number {
  return roundHalfUp(hours * 60);
}

export function clockWorkedMinutes(
  startMs: number,
  endMs: number,
  unpaidBreakMinutes: number,
): number {
  const raw = Math.max(0, Math.round((endMs - startMs) / 60000) - unpaidBreakMinutes);
  return raw;
}

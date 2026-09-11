export function londonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export function weekEndingSunday(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = date.getUTCDay();
  const add = weekday === 0 ? 0 : 7 - weekday;
  date.setUTCDate(date.getUTCDate() + add);
  return date.toISOString().slice(0, 10);
}

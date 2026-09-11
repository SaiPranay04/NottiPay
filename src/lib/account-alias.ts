export const ACCOUNT_ALIASES: Record<string, { kind: string; currency: string; name?: string }> = {
  acc_cash_gbp: { kind: "cash", currency: "GBP", name: "Cash" },
  acc_forex: { kind: "card", currency: "GBP" },
  acc_uk_bank: { kind: "bank", currency: "GBP", name: "UK bank" },
  acc_in_bank: { kind: "bank", currency: "INR", name: "Indian bank" },
  acc_cash_inr: { kind: "cash", currency: "INR" },
};

type AccountRow = { id: string; kind: string; currency: string; name: string };

export function matchAccount<T extends AccountRow>(accounts: T[], slugOrId: string): T | null {
  const direct = accounts.find((account) => account.id === slugOrId);
  if (direct) return direct;
  const alias = ACCOUNT_ALIASES[slugOrId];
  if (!alias) return null;
  return (
    accounts.find(
      (account) =>
        account.kind === alias.kind &&
        account.currency === alias.currency &&
        (!alias.name || account.name === alias.name),
    ) ?? null
  );
}

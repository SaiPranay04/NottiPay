export type CashStackInput = {
  gbpCash: number;
  reserved: number;
  pacedEssentials: number;
  emergencyFloor: number;
};

export type CashStack = {
  gbpCash: number;
  reserved: number;
  available: number;
  pacedEssentials: number;
  emergencyFloor: number;
  safeThisWeek: number;
};

export function cashStack(input: CashStackInput): CashStack {
  const available = input.gbpCash - input.reserved;
  const safeThisWeek = Math.max(
    0,
    available - input.pacedEssentials - input.emergencyFloor,
  );
  return {
    gbpCash: input.gbpCash,
    reserved: input.reserved,
    available,
    pacedEssentials: input.pacedEssentials,
    emergencyFloor: input.emergencyFloor,
    safeThisWeek,
  };
}

export function dailySafe(safeThisWeek: number, daysUntilPayday: number): number {
  return Math.floor(safeThisWeek / Math.max(1, daysUntilPayday));
}

export function loanInterestSoFar(params: {
  disbursements: { principalMinor: number; days: number }[];
  annualRatePct: number;
  interestPaidMinor: number;
}): number {
  const accrued = params.disbursements.reduce((n, d) => {
    return n + Math.round((d.principalMinor * (params.annualRatePct / 100) * d.days) / 365);
  }, 0);
  return Math.max(0, accrued - params.interestPaidMinor);
}

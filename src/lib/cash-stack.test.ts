import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cashStack, dailySafe, loanInterestSoFar } from "./cash-stack.ts";

describe("cash stack", () => {
  it("matches the spec worked example", () => {
    const s = cashStack({
      gbpCash: 43200,
      reserved: 28000,
      pacedEssentials: 2000,
      emergencyFloor: 0,
    });
    assert.equal(s.available, 15200);
    assert.equal(s.safeThisWeek, 13200);
  });

  it("does not subtract reserved twice", () => {
    const s = cashStack({
      gbpCash: 29640,
      reserved: 12000,
      pacedEssentials: 3400,
      emergencyFloor: 1000,
    });
    assert.equal(s.safeThisWeek, 13240);
  });

  it("floors daily safe", () => {
    assert.equal(dailySafe(13200, 4), 3300);
  });

  it("accrues simple interest on a disbursement", () => {
    const interest = loanInterestSoFar({
      disbursements: [{ principalMinor: 45_000_000, days: 15 }],
      annualRatePct: 9.85,
      interestPaidMinor: 0,
    });
    assert.ok(interest > 0);
    assert.equal(interest, Math.round((45_000_000 * 0.0985 * 15) / 365));
  });
});

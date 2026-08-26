import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertGbpToInr,
  convertInrToGbp,
  expectedGrossMinor,
  hoursOnlyMinutes,
  poundsToMinor,
  roundHalfUp,
} from "./money.ts";

describe("money", () => {
  it("stores pounds as integer pence", () => {
    assert.equal(poundsToMinor(7.6), 760);
    assert.equal(poundsToMinor(3.5), 350);
  });

  it("converts GBP→INR with half-up", () => {
    assert.equal(convertGbpToInr(760, 110.3125), 83838);
  });

  it("round-trips INR→GBP near the original pence", () => {
    const gbp = convertInrToGbp(83838, 110.3125);
    assert.equal(gbp, 760);
  });

  it("pays hours-only shifts in integer pence", () => {
    assert.equal(hoursOnlyMinutes(5), 300);
    assert.equal(expectedGrossMinor(300, 1260), 6300);
  });

  it("roundHalfUp is not banker's rounding", () => {
    assert.equal(roundHalfUp(1.5), 2);
    assert.equal(roundHalfUp(-1.5), -2);
  });
});

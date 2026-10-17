import assert from "node:assert/strict";
import { test } from "node:test";
import { fplFor, liheapLimitFor, matchPrograms, stackedValue } from "./rules";

const ids = (m: ReturnType<typeof matchPrograms>, status?: "likely" | "check") =>
  m.filter((x) => !status || x.status === status).map((x) => x.program.id);

test("limits match the spec", () => {
  assert.equal(fplFor(1) * 2, 31920);
  assert.equal(fplFor(1) * 3, 47880);
  assert.equal(liheapLimitFor(1), 34549);
  assert.equal(liheapLimitFor(4), 66423);
});

test("Denise: 68, lives alone, ~$24k → discount, LIHEAP, EASE, WAP all likely", () => {
  const m = matchPrograms({ householdSize: 1, incomeRangeId: "20-25", flags: ["age65"], renter: false });
  // Ranked by value: LIHEAP (up to $810) before the $402 discount.
  assert.deepEqual(ids(m, "likely"), ["liheap", "gp-iqd", "gp-ease", "wap"]);
  assert.deepEqual(stackedValue(m), { billLow: 802, billHigh: 1212, upgrades: 5000 });
});

test("discount requires a qualifier even when income is low", () => {
  const m = matchPrograms({ householdSize: 1, incomeRangeId: "15-20", flags: [], renter: false });
  assert.ok(!ids(m).includes("gp-iqd"));
});

test("range straddling a limit becomes 'check', range above drops out", () => {
  // 1 person, $25k–$32k: under 200% FPL ($31,920)? straddles → check
  const m = matchPrograms({ householdSize: 1, incomeRangeId: "25-32", flags: ["ssdi"], renter: false });
  assert.ok(ids(m, "check").includes("gp-iqd"));
  // 1 person, $50k+: over every income limit
  const none = matchPrograms({ householdSize: 1, incomeRangeId: "50-65", flags: ["age65"], renter: false });
  assert.deepEqual(ids(none), []);
});

test("family of 4 at $65k–$80k → EASE likely (300% FPL = $99k), LIHEAP and WAP to check", () => {
  const m = matchPrograms({ householdSize: 4, incomeRangeId: "65-80", flags: ["children"], renter: true });
  assert.deepEqual(ids(m, "likely"), ["gp-ease"]);
  assert.deepEqual(ids(m, "check"), ["liheap", "wap"]);
  assert.ok(m[0].reasons.some((r) => r.includes("landlord")));
});

test("Project SHARE only shows for a crisis, always as 'check'", () => {
  const m = matchPrograms({ householdSize: 2, incomeRangeId: "80+", flags: ["crisis"], renter: false });
  assert.deepEqual(ids(m), ["project-share"]);
  assert.equal(m[0].status, "check");
});

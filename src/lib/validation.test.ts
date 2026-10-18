import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadProblem, billProblem } from "./validation";
import { SAMPLE_BILL } from "./bill";

test("accepts supported photo and PDF formats at the size limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]) assert.equal(uploadProblem({ type, size: 10 * 1024 * 1024 }), null);
});
test("rejects empty files before an AI request", () => assert.ok(uploadProblem({ size: 0, type: "image/png" })));
test("rejects oversized files before an AI request", () => assert.ok(uploadProblem({ size: 10 * 1024 * 1024 + 1, type: "application/pdf" })));
test("rejects unsupported files", () => assert.ok(uploadProblem({ size: 100, type: "text/plain" })));
test("accepts the sample bill", () => assert.equal(billProblem(SAMPLE_BILL), null));
test("rejects missing and reversed billing dates", () => {
  assert.ok(billProblem({ ...SAMPLE_BILL, billingStart: "" }));
  assert.ok(billProblem({ ...SAMPLE_BILL, billingEnd: SAMPLE_BILL.billingStart }));
});
test("rejects negative usage and invalid numeric input", () => {
  assert.ok(billProblem({ ...SAMPLE_BILL, kwhUsed: -1 }));
  assert.ok(billProblem({ ...SAMPLE_BILL, pastDue: NaN }));
});

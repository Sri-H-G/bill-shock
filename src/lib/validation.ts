export function uploadProblem(file: { size: number; type: string }): string | null {
  if (file.size === 0) return "This file is empty. Choose another photo or PDF.";
  if (file.size > 10 * 1024 * 1024) return "This file is over 10 MB. Choose a smaller photo or PDF.";
  if (!["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].includes(file.type)) return "Choose a JPG, PNG, WebP, GIF or PDF bill. Other file types cannot be read.";
  return null;
}

export function billProblem(bill: { billingStart: string; billingEnd: string; kwhUsed: number; pastDue: number; previousKwh: number | null }): string | null {
  const start = Date.parse(bill.billingStart);
  const end = Date.parse(bill.billingEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "Check the billing dates. The end date must be after the start date.";
  if (![bill.kwhUsed, bill.pastDue, bill.previousKwh ?? 0].every((n) => Number.isFinite(n) && n >= 0)) return "Usage and past-due amounts must be zero or more. Please check the numbers.";
  return null;
}

// Fake-door counter for the premium price test. Logs only the plan clicked,
// never who clicked. Swap console for a real analytics sink when one exists.
export async function POST(req: Request) {
  const { plan } = await req.json().catch(() => ({ plan: "unknown" }));
  const safePlan = plan === "monthly" || plan === "annual" ? plan : "unknown";
  console.log(JSON.stringify({ event: "premium_fake_door", plan: safePlan, at: new Date().toISOString() }));
  return Response.json({ ok: true });
}

# Bill Shock

Snap a photo of a Georgia Power bill → see why it changed → find the assistance programs your household may qualify for, with a checklist of what to bring and official links. Free, no account, nothing stored.

> Georgia is building billions in new power for AI. Families struggling with today's bills still can't find the help that exists. Bill Shock finds it free, then helps households keep bills under control.

## Demo scope

| Feature | Plan | Status |
|---|---|---|
| Bill scan and plain-language explanation | Free | Working (Claude vision) |
| Assistance matching (5 programs) | Free | Working (fixed rules) |
| Checklist and official links | Free | Working |
| Bill history chart, alerts, forecast, tips | Premium | Simulated (`/premium`) |
| "Start premium" price test | Premium | Fake door; logs plan clicked |
| Referral management, outcome reporting | Institutional | Planned |

No API key? Click **"Try a sample bill"** to run the whole flow with Denise's (illustrative) August bill.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for real bill scanning
npm run dev                  # http://localhost:3000
npm test                     # rules engine tests
```

## How it works

```
photo/PDF ──► /api/extract ──► Claude (claude-opus-5-5) ──► JSON against a fixed Zod schema
                                                             │
                     user confirms / edits the numbers ◄─────┘
                                   │
          explainChange()  ◄───────┤  deterministic "what changed" (kWh, season, days, past due)
                                   │
   5 questions ──► matchPrograms() ──► "likely" / "check with the program", ranked by value
                   (src/lib/rules.ts over src/data/programs.json)
```

- **AI only reads and explains the bill.** Eligibility never comes from the model: it comes from `src/data/programs.json`, a versioned file with limits, values, source links and `lastChecked` dates.
- **Income is a range, never a number.** If the whole range is under a limit, the program shows as *likely*; if the limit falls inside the range, *check with the program*; if the range is entirely over, it's hidden.
- **Privacy:** the bill is sent to the model and discarded. The extraction schema deliberately has no name, address or account-number fields. Screening answers never leave the browser.

## Key files

| Path | What |
|---|---|
| `src/data/programs.json` | Program rules, limits, sources (edit this when rules change) |
| `src/lib/rules.ts` | Matching engine |
| `src/lib/bill.ts` | Extraction schema, change explanation, sample bill |
| `src/lib/tracker.ts` | Premium forecast math (seasonal range) |
| `src/app/api/extract/route.ts` | Claude vision call |
| `src/app/api/interest/route.ts` | Fake-door click counter |

## Before the demo

- [ ] Confirm LIHEAP income limits with Georgia DFCS (current numbers are from a third-party source; sizes 2–3 and 5–8 are derived).
- [ ] Confirm the 2026 FPL per-additional-person amount (`fpl.perAdditionalPerson` in `programs.json`).
- [ ] Test extraction on real bills (target: 95%+ of fields correct after user confirmation).

## Deploy

Vercel: import the repo, set `ANTHROPIC_API_KEY`, deploy. No database needed for the demo.

Results are "potentially relevant" programs only. Each program decides eligibility. Not affiliated with Georgia Power.

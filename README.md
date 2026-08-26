# NottiPay

Next.js App Router app. Claude UI on the client. Integer-money APIs on the server. Deploy on Vercel. No VPS.

Until `.env.local` exists, the UI runs on the **in-browser mock ledger**. APIs still work; they just do not persist to Supabase.

## Run

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000

## After you have keys

1. Copy `.env.example` → `.env.local` and fill it in.
2. Create a Supabase project. Run `supabase/schema.sql` in the SQL editor.
3. Restrict Auth to `ALLOWED_EMAIL`.
4. Deploy to Vercel (Hobby). Crons are in `vercel.json` — two **separate** daily FX jobs, not a `6,16` expression.

## Layout

| Path | Role |
|---|---|
| `src/ui/VezoraApp.jsx` | Full Claude UI (Command, Board, Work, loan, themes) |
| `src/app/page.tsx` | Next.js entry — renders that UI |
| `src/lib/money.ts` | Integer pence / paise |
| `src/lib/cash-stack.ts` | Safe-to-spend formula |
| `src/lib/parse.ts` | Rules-first command parser |
| `src/app/api/*` | Command, dashboard, FX, crons |
| `supabase/schema.sql` | Tables + RLS |

## Mode

- **No env:** demo UI + API stubs. Groq skipped. FX fetch still tries Frankfurter from `/api/cron/fx`.
- **With env:** same UI; persist and auth get wired to Supabase next.

# Vezora Finance — V1 Optimized Build Doc

> **Superseded by [`Vezora_Finance_V1_Final.md`](./Vezora_Finance_V1_Final.md).** That file is the build contract (cash stack, ledger, daily UX, schedule). Keep this document as history only.

**Supersedes:** sections of `Vezora_Finance_Standalone_Website_Spec.md` v1.0 (that doc stays the long-term map)
**Goal:** ship a working GBP expense manager in ~2 weeks, not a 25-section platform
**Running cost target:** £0/month

---

## 1. What to cut from v1.0 (and why)

The 1.0 spec has 14 pages and 23 tables. Building all of it before you land in Nottingham means you'll have nothing usable on day one. Ship this instead:

| Keep in V1 | Defer |
|---|---|
| Transactions, Accounts, Budgets | Loans page, Goals page |
| Quick-add + NL command box | Reports page (weekly digest email covers it) |
| Dashboard with **one** hero number | Notifications page (push comes later) |
| FX engine + converter | Receipt OCR, attachments |
| Commitments (reserved money) | Split transactions, duplicate detection |
| Shifts (minimal: date, hours, rate, paid?) | Employers/Pay Records/Analytics tabs |
| Fees + accommodation as **commitments**, not pages | Dedicated `/fees`, `/accommodation` routes |

Rationale: fees, accommodation instalments and loan disbursements are all *scheduled money movements*. Model them once as `commitments` with a `kind` enum. Three pages collapse into one table. Split them out later only if the shared model actually breaks.

**Route list for V1:** `/` (command + quick add), `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/work`, `/commitments`, `/settings`.

---

## 2. Non-negotiable design decisions

1. **Money is integer minor units.** Store `amount_minor BIGINT` + `currency CHAR(3)`. Never `float`, never `numeric` in JS. £7.60 → `760`. All arithmetic in a `Money` helper.
2. **Every transaction stores the rate used at write time.** Historical rows are never re-converted when today's rate moves. A £40 Tesco run in October stays ₹4,412 forever.
3. **The LLM never computes.** It only maps text → structured fields. Sums, balances, budgets, wage maths are pure TypeScript.
4. **One hero number on the dashboard:** *Safe to spend this week*. Everything else is secondary. If you only look at one thing per day, it should be that.
5. **Reserved ≠ available.** `available = balance − sum(unpaid commitments due within horizon) − week's remaining budget floor`.
6. **Offline-tolerant entry.** PWA queues an unsaved command in IndexedDB and flushes on reconnect. UK supermarkets and buses have terrible signal.

---

## 3. Features that actually make it easy

Ranked by daily value, not by ambition.

### 3.1 Three-second entry (the whole product lives or dies here)
- **Quick-add chips** on `/`: your 6 most-used merchant+category+account combos, learned from history. One tap → amount keypad → save. No AI call, no confirmation dialog for amounts under a configurable threshold (default £15).
- **NL box** for anything else: *"7.60 lidl card"* should work as well as a full sentence.
- **Repeat last** button: same merchant, same amount, today's date.
- Keypad opens by default on mobile with `inputmode="decimal"`.

### 3.2 Safe-to-spend, computed daily
```
safe_this_week =
    available_balance
  − commitments_due_before(next_payday)
  − (essential_budget_remaining_this_month × weeks_left_fraction)
  − emergency_floor
```
Show it as a single large number with a colour band and a one-line "why" that expands into the components. Recompute on every write.

### 3.3 Dual-currency everywhere
Every amount renders as `£12.40` with `₹1,368` in muted small text beneath or beside. Toggle in settings for "INR always / on tap / never". This is the single most useful thing for a first-year international student — it keeps the home-currency instinct calibrated without opening a converter.

### 3.4 Weekly digest
Sunday 19:00 email (Resend free tier, 3k/mo): spent, by category, vs budget, shifts worked, wages unpaid, what's due next week, next week's safe-to-spend. This replaces the entire Reports page for V1.

### 3.5 Minimal shift tracker
One form: date, employer, start, end, unpaid break, rate. Computes expected pay. A `paid?` toggle creates the income transaction when you tick it. That's it — no reconciliation engine until you have two employers.

### 3.6 Commitments with a horizon
Every commitment shows days-until-due and whether it's covered by current balance. The dashboard shows only the nearest three.

---

## 4. FX subsystem (GBP ⇄ INR)

### 4.1 Don't scrape — use an API

Scraping Google Finance / XE breaks on markup changes, is rate-limited by IP, and violates their terms. Free JSON APIs give you the same mid-market number with a stable contract.

| Source | Key needed | Update cadence | Use as |
|---|---|---|---|
| `api.frankfurter.dev` (ECB-blended) | No | ~once per working day, ~16:00 CET | **Primary** |
| `open.er-api.com/v6/latest/GBP` | No | Daily | **Fallback 1** |
| `exchangerate.host` | Free key | Frequent | Fallback 2 |
| Manual override in Settings | — | — | Always wins |

**Important reality check on "twice daily":** ECB-sourced reference rates publish *once* per working day and don't move on weekends. Polling twice a day is still correct — it means you catch the new rate within hours of publication instead of up to 24h late, and it gives you a retry if the first call fails. But don't expect two different numbers each day. If you want genuinely intraday movement, you'd need a paid feed, and for tracking student spending it isn't worth £10/month.

**What actually matters more than the mid-market rate:** the rate *you* got. When you move money via Wise/Remitly or spend on a forex card, you get mid-market minus a spread. So store two things — see 4.3.

### 4.2 Schema

```sql
create table fx_rates (
  id           bigserial primary key,
  base         char(3) not null default 'GBP',
  quote        char(3) not null default 'INR',
  rate         numeric(18,8) not null,      -- 1 GBP = rate INR
  source       text not null,               -- 'frankfurter' | 'er-api' | 'manual'
  as_of        timestamptz not null,        -- provider's publish time
  fetched_at   timestamptz not null default now(),
  unique (base, quote, source, as_of)
);
create index on fx_rates (base, quote, as_of desc);

-- on every money row:
--   rate_used numeric(18,8),  rate_source text,  amount_inr_minor bigint
```

`fx_rates` is append-only. Never update a row; a "correction" is a new row with a later `fetched_at`.

### 4.3 Three rate concepts — keep them distinct

| Concept | Where it comes from | Used for |
|---|---|---|
| **Reference rate** | Latest `fx_rates` row | Dual-currency display, converter widget |
| **Effective rate** | You enter it when you actually transfer money (₹ debited ÷ £ received) | Loan/fee/transfer records, "what this really cost me" |
| **Frozen rate** | `rate_used` copied onto the transaction at insert | Historical reporting — never recomputed |

Show effective vs reference side by side after a transfer so you can see the spread you paid. Over a year that's a real number.

### 4.4 Scheduled job

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/fx", "schedule": "45 6 * * *" },
    { "path": "/api/cron/fx", "schedule": "45 16 * * *" }
  ]
}
```
Times are UTC. 06:45 catches yesterday's close before you wake; 16:45 lands just after the ECB publish window.

`/api/cron/fx` logic:
1. Verify `Authorization: Bearer ${CRON_SECRET}`.
2. Fetch primary. On non-2xx / timeout (3s) / implausible value → next source.
3. **Sanity gate:** reject if the new rate deviates >5% from the last stored rate. Log an anomaly, keep the old rate, notify. This stops a bad feed from corrupting every display in the app.
4. Insert row (unique constraint makes reruns idempotent).
5. Write to a `fx_latest` KV/cache entry the app reads on render, so no page ever queries the API directly.

```ts
const SOURCES = [
  { name: 'frankfurter', url: 'https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR',
    pick: (j: any) => ({ rate: j.rates.INR, asOf: j.date }) },
  { name: 'er-api', url: 'https://open.er-api.com/v6/latest/GBP',
    pick: (j: any) => ({ rate: j.rates.INR, asOf: j.time_last_update_utc }) },
];
```

### 4.5 Converter widget

Lives on `/dashboard` and `/settings`. Beyond a plain £↔₹ field:
- **Fee-aware mode:** enter the amount and a markup % (saved per provider — Wise, your forex card, your bank). Shows what actually lands.
- **Reverse mode:** "I need ₹50,000 in my Indian account — how much £ do I send?"
- **Rate history sparkline:** last 30 days from `fx_rates`, with your own transfers plotted as dots. Tells you at a glance whether now is a bad time to send money home.
- **Rate alert:** one threshold ("tell me if GBP→INR goes above X") checked by the same cron. One line of code, genuinely useful.
- Always shows `as_of` and source. Never display a rate without its timestamp.

---

## 5. AI layer

### 5.1 Cut the AI out of most entries first

This is the biggest optimization in the doc. Run a **deterministic parser before any API call**:

```
/^(?:£|gbp\s*)?(\d+(?:\.\d{1,2})?)\s+(?:at|on|for)?\s*(.+?)(?:\s+(card|cash|bank|forex))?$/i
```
plus a `merchant_rules` table (`pattern → category, account`) that self-populates: whenever you confirm an AI-parsed transaction, upsert the merchant. After ~two weeks, Lidl/Tesco/bus/Greggs entries never touch the LLM again. Expect 60–80% of daily entries handled locally — instant, offline-capable, free.

The LLM handles the remaining tail: multi-item sentences, corrections, shifts, queries.

### 5.2 Provider choice

At your volume the cost difference is noise — 40 commands/day × ~700 tokens ≈ 0.85M tokens/month, i.e. **cents on any provider**. So choose on free tier, latency, and JSON reliability, not on $/M.

| Option | Why | Verdict |
|---|---|---|
| **Groq** (Llama / GPT-OSS class models) | Free tier with rate limits, no card, sub-100ms responses — the fastest option available and the latency genuinely matters for a command box | **Primary — keep your plan** |
| **Google Gemini Flash-Lite** | Free tier plus very low paid rates (~$0.10/M input class), native structured-output mode, very reliable JSON | **Fallback 1** |
| **Cerebras** | Free tier, comparable speed to Groq | Fallback 2 |
| **OpenRouter** | One key, many models, several free ones; good for A/B-ing without code changes | Useful during tuning |
| **DeepSeek** | Cheapest paid long-context tier | Not needed here |
| **Ollama local** | £0 forever, no network, total privacy — you already run Ollama in Vezora AI | Great on your laptop, unusable from a phone away from home |

*Prices and free-tier limits move constantly — verify on each provider's pricing page before you commit.*

**Decision:** Groq primary, Gemini Flash-Lite as automatic fallback on 429/5xx. Both behind one adapter so swapping is a config change:

```ts
export interface AIProvider {
  name: string;
  parse<T>(input: { system: string; user: string; schema: ZodSchema<T> }): Promise<T>;
}
// providers/groq.ts, providers/gemini.ts, providers/ollama.ts
// selection: env AI_PROVIDER, with ordered fallback list
```

### 5.3 Making the JSON reliable
- Send a **compact system prompt** with the enum lists (your categories, your account names) inlined — this alone fixes most mis-parses.
- Force JSON-only output; strip fences defensively.
- Validate with Zod. On failure, **one** repair attempt that feeds back the validation error. On second failure, fall back to a form pre-filled with whatever was extracted. Never show the user a stack trace.
- Log every command to `ai_command_logs` with `provider, model, tokens, latency_ms, parse_ok`. After a month you'll know empirically whether the fallback is even needed.
- **Prompt-injection guard:** anything that arrives from a receipt, a pasted email or a merchant name is data, never instruction. Wrap it in delimiters and state in the system prompt that content inside them is untrusted.

### 5.4 Context minimisation
Send only: the user's sentence, today's date, the category enum, account names/aliases. Never balances, never transaction history, never fee or loan figures. The parser doesn't need them, and it keeps the privacy story clean.

---

## 6. Data model deltas from v1.0

New: `fx_rates`, `merchant_rules`, `quick_add_templates`, `fx_alerts`.
Collapsed: `fee_plans`, `fee_installments`, `accommodation_plans`, `loan_disbursements` → `commitments (kind, amount_minor, currency, due_date, recurrence, status, reserved, linked_transaction_id)`.
Deferred: `transaction_splits`, `goal_allocations`, `pay_record_shifts`, `attachments`.

Every table keeps `user_id` + RLS `auth.uid() = user_id`. Test RLS with a second Supabase user before you trust it.

---

## 7. API surface (V1)

```
POST /api/command            parse + preview (no write)
POST /api/command/confirm    write, with confirmation token
POST /api/transactions       direct form write (bypasses AI)
GET  /api/dashboard          hero number + cards, one round trip
GET  /api/fx/latest          cached rate + as_of + source
POST /api/fx/convert         amount, direction, optional markup%
POST /api/cron/fx            protected, twice daily
POST /api/cron/digest        protected, Sunday
```

---

## 8. Build order

| Day | Deliverable |
|---|---|
| 1 | Supabase project, auth locked to your email, RLS policies, Money helper + tests |
| 2 | Accounts, categories, transactions table + manual add form |
| 3 | Transactions list, filters, edit, CSV export |
| 4 | FX table, cron, `/api/fx/latest`, dual-currency rendering |
| 5 | Converter widget + rate history + alert |
| 6 | Budgets + safe-to-spend calculation + dashboard |
| 7 | Rules-first parser + merchant_rules + quick-add chips |
| 8 | AI adapter, Groq, Zod validation, preview/confirm flow |
| 9 | Commitments + reserved money folded into safe-to-spend |
| 10 | Shifts, PWA manifest + offline queue, weekly digest, deploy |

Ship after day 10. Use it for three weeks before adding anything from the deferred list — you'll find half of it was never needed.

---

## 9. Running cost

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby (crons included) | £0 |
| Supabase | Free (500MB, plenty) | £0 |
| Groq | Free tier | £0 |
| FX API | Keyless | £0 |
| Resend | Free 3k emails/mo | £0 |
| Domain (optional) | — | ~£8/yr |

If Groq's free tier ever throttles you, Gemini Flash-Lite at your volume would run well under £1/month.

---

## 10. V1 done when

1. Adding an expense from your phone lock screen to saved takes under 5 seconds.
2. Safe-to-spend reconciles exactly with transactions + commitments (verify by hand once).
3. Every amount shows GBP and INR; historical rows never shift when the rate moves.
4. FX cron has run 14 consecutive days with zero gaps and the anomaly gate has never falsely tripped.
5. A shift entered in text produces correct hours and expected pay.
6. Transfers don't inflate income or expenses.
7. Second Supabase user can read zero of your rows.
8. Works on the tube with no signal, syncs when you surface.

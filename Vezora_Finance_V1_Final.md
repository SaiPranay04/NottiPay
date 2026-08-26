# Vezora Finance — V1 Final

**Status:** Build contract. Implement this file.  
**Version:** 1.0-final  
**User:** Sai Pranay (private, single-user, Europe/London)  
**Goal:** a phone website you actually use at the till, not a 14-page platform  
**Cost:** £0/month  
**Ship:** ~12 days, then three weeks of real use before grocery inventory or price history

**How to read the other docs**

| File | Role |
|---|---|
| **This file** | What to build now |
| `Vezora_Finance_Standalone_Website_Spec.md` | Long-term map (Vezora AI, loans, full work tracker). Do not implement deferred pages from it. |
| `Vezora_Finance_V1_Optimized_Build_Doc.md` | Earlier cut. Superseded. History only. |

---

## 0. Mandatory requirements (from you)

These are in V1. Grocery inventory and Lidl product-price history are **not**.

| You said | V1 behaviour |
|---|---|
| Track every expense from the day you land | First transaction date is day 1. No “start of month” gate. |
| Day 1–2 mostly cash / forex | Seed **Cash GBP** + **Forex card** live; **UK bank** exists at £0 until you open it. |
| Then cash and card in parallel | Every spend has an **account**: cash, forex, or bank card. “Paid £3.50 cash at Lidl” vs “£2.30 card for transport”. |
| Text → parse → store | Command box + chips. Preview, then confirm. |
| Proper balances | Each account’s `current_balance` moves on confirm. |
| Good stats + monthly grocery | Dashboard: grocery this month, cash vs card this month, week, month, daily safe spend. |
| Weekly report mail | Sunday digest. Monthly block on the 1st (or first Sunday). |
| After confirm, everything updates | One `recordTransaction()` refresh: history, grocery month, balances, safe week, safe day, reports. |
| Grocery inventory / Lidl prices | **V2. Ignore now.** |
| Loan tracker, amount taken, interest so far | `/loans`. You log disbursements; code accrues interest. Loan money never inflates safe-to-spend. |
| GBP⇄INR twice a day, convert any number | Cached `gbp_in_inr` and `inr_in_gbp`. Dual display + converter. |
| Part-time page, dormant until the offer | `/work` is one big **I got a job** button until you save employer, role, £/hour. Then day/hour/pay. |

Example lines the parser must accept:

> paid 3.5 pound cash at lidl for butter and curd  
> paid 2.3 pounds card for transport  
> spent 4.20 bus cash  
> Canara disbursed 450000 rupees toward tuition

---

## 1. Daily life, not a dashboard product

You win if a normal day looks like this:

1. Open the home-screen icon. See **Safe to spend this week** in one second.
2. At Lidl, tap **Lidl**, type `7.60`, hit **Save £7.60**. Under five seconds. No Groq. No second modal.
3. Before a weekend: expand the “why” under the hero. If Edinburgh is £70 and the hero is £95, go. If it is £40, don’t.
4. After a café shift (once the job exists): one form, tick **Paid** when the money lands. Expected pay is never cash.
5. Sunday evening: a short email. Totals, grocery this month, what’s due — not a merchant dump.

If a feature does not serve that loop, it is not V1.

### What you will not do in V1

Goals page, standalone reports *page*, notifications page, receipt OCR, **grocery inventory**, **Lidl / product price history**, splits, duplicate detection, bank feeds, voice, dedicated `/fees` or `/accommodation` routes, overtime engine, pay-reconciliation matching, EMI scenario lab, autonomous Zara.

Fees, Nottingham Two, and the phone plan are **commitments**. Loan **disbursements** live on `/loans`, not as reserved bills.

---

## 2. Principles (non-negotiable)

1. **Phone first.** Thumb reach. Command is a full-screen tab, not a floating window.
2. **Fast path is not AI.** Known shops never wait on a network model.
3. **The LLM never computes.** It maps text → fields. Money, hours, FX, and the hero are TypeScript.
4. **Integer money.** `amount_minor BIGINT`. £7.60 → `760`. No floats in JS.
5. **Frozen FX.** A row keeps the rate it was written with. History does not drift.
6. **One hero.** *Safe to spend this week.* Everything else is secondary.
7. **Owned GBP ≠ borrowed, ≠ Indian cash, ≠ unpaid wages.** The hero is spending money in Nottingham this week.
8. **One writer for each pound.** `recordTransaction()` is the only insert/update path.
9. **Undo, not silent history.** Fifteen minutes, compensating row + audit.
10. **Privacy.** Records, not bank passwords. Groq gets the sentence, today’s date, category names, account aliases. Never balances.

---

## 3. Routes and navigation

**Routes:** `/` · `/dashboard` · `/transactions` · `/accounts` · `/budgets` · `/work` · `/loans` · `/commitments` · `/settings`

**Mobile chrome**

- Bottom nav: **Board · Work · Command · More**
- Centre **Command** is a **full-screen page** (`/`), not a floating bubble. Icon on the tab bar. This is how you type everything: spends, shifts, loan lines, questions.
- More: Transactions, Accounts, Budgets, Commitments, Loans, Settings.
- Desktop: same Command in the left nav; keyboard `/` focuses the box. Right-hand preview panel is allowed. A floating chat widget is **not**.

After a command is parsed, the app **opens the matching section** with a confirm preview on that page (shift → `/work`, spend → `/transactions`, loan → `/loans`). You see the updated module, then Confirm.

Till shortcut: on Command, chips + keypad still sit under the text box so Lidl stays under five seconds. That is not a second app, just a second input on the same page.

---

## 4. Cash stack (lock this before any UI)

These six names are the only ones the dashboard, tests, and “why” line may use.

| Name | Definition | Must not include |
|---|---|---|
| `gbp_cash` | Sum of `current_balance` on accounts where `include_in_safe_spend = true` (owned GBP) | INR accounts, education-loan account, unpaid wages, undisbursed sanction, goal targets |
| `reserved` | Sum of the **next unpaid occurrence** of each commitment with `due_date < next_payday` (or `horizon_end`) | Later recurrence months, already-paid rows, loan events |
| `available` | `gbp_cash − reserved` | A second subtraction of the same commitments |
| `paced_essentials` | Remaining **essential** budget this month whose category is **not** already covered by a commitment, × `weeks_left_fraction` | Rent, tuition, phone if those exist as commitments |
| `emergency_floor` | Settings integer `emergency_floor_minor` (default `0`) | A Goals table (deferred) |
| `safe_this_week` | `max(0, available − paced_essentials − emergency_floor)` | Projected shift pay, INR converted *into* the total |

**INR on the hero is display only:** show `Money.convert(safe_this_week, reference_rate)` under the pounds. Do not add Indian account balances into `gbp_cash`.

**`weeks_left_fraction`** = `days_until_payday / 7`, capped at `1` if payday is more than 7 days away when computing *this week*. For the monthly pacing term use `days_until_month_end / days_in_month` only inside `paced_essentials`.

**`next_payday`** is a date in Settings (not inferred from shifts in V1). `horizon_end = next_payday`. If unset, use 7 days from today.

**Covered?** A commitment is covered when `gbp_cash >= that occurrence`. This is a badge, not another subtraction.

**Budget leftover is pacing, not cash.** £400 in the bank with £40 grocery budget left is still £400. The hero may show less so you do not spend the grocery envelope on Friday. Rent must not be in both `reserved` and `paced_essentials`.

**Affordability** (“can I spend £70?”): `70.00 <= safe_this_week`. One line. No model maths.

**Safe per day** (in the expanded “why”, not a second hero): `floor(safe_this_week / max(1, days_until_payday))`.

Recompute on every write. The “why” line lists the six components as amounts that drill into transactions or commitments.

### Worked example (for tests)

- UK bank £420.00, cash GBP £12.00 → `gbp_cash = 43200`
- Rent £270 due before payday, phone £10 due before payday → `reserved = 28000`
- `available = 15200` (£152.00)
- Groceries essential remaining £40, not a commitment, 0.5 week fraction → `paced_essentials = 2000`
- `emergency_floor = 0`
- `safe_this_week = 13200` (£132.00)

If rent were also in the essential budget, ignore it there. Still `reserved = 28000`.

---

## 5. Ledger

### Transaction types

| Type | Accounts | P&L | Notes |
|---|---|---|---|
| `expense` | Debit one owned account | Spend | Category required |
| `income` | Credit one owned account | Income | Salary only when money received |
| `refund` | Credit one owned account | Negative spend | Same category as original when known |
| `transfer` | Two accounts, opposite signs | **Neither** | `transfer_group_id` shared; FX effective rate allowed |
| `balance_adjustment` | One account set to a stated balance | Not P&L | Creates a delta row; always audited |

Fee or rent **payment** is an `expense` (category university/rent) with `commitment_id` set. That occurrence becomes `paid`. It is not a second module.

Loan **disbursement** is a `loan_event` on `/loans`. It does **not** increase `gbp_cash` unless money actually lands in an owned account (you then add a separate transfer/income). Do not put an education-loan account on `include_in_safe_spend`.

### Money helper

```text
£7.60  → 760
₹1,368 → 136800   (paise)

convertGbpToInr(gbpMinor, rate) =
  roundHalfUp(gbpMinor * rate)
  // 760 * 110.3125 = 83837.5 → 83838 paise = ₹838.38
```

All arithmetic in `src/lib/money.ts`. Page components never multiply. Tests for split pennies, negative, transfer both legs, and freeze-on-insert.

Every money row stores:

- `amount_minor`, `currency`
- `rate_used numeric(18,8)`, `rate_source`, `amount_inr_minor`
- `occurred_at timestamptz` (London local date derived from this)

### `recordTransaction()`

Used by: Command confirm, Add keypad, form, shift **Paid**, commitment **Mark paid**, edit, undo.

Not used: cron, Groq. Cron only writes `fx_rates` / digest send / alerts.

---

## 6. Command (the product)

**Placement: tab-bar page, not a floating window.**

| Option | Verdict |
|---|---|
| Floating window / bubble | **No.** Covers the page you need to check, fights one-handed use, feels like a support chat. |
| Command as its own nav icon (full screen) | **Yes.** Always one tap from anywhere. Keyboard and preview have room. |
| After parse, stay in the box only | **No.** Open the section that changed so you can see the update in context. |

`/` is Command. Bottom-nav centre icon opens it. One text box runs **all** writes: expenses, transfers, shifts, loan events, commitments, corrections, questions.

### Layout (phone)

1. **Text box** — large, focused, placeholder: `3.50 lidl cash` or `worked 5 hours today`.
2. **Chips + keypad** under it for till speed (same as before). Optional; text can do the same job.
3. Send → parse → **route to the target page with a preview card**:

| You type | Opens | Preview shows |
|---|---|---|
| `paid 3.50 cash at lidl for butter` | `/transactions` | Amount, cash, groceries, note, new cash balance, effect on hero |
| `paid 2.30 card for transport` | `/transactions` | Amount, UK bank (or forex), category |
| `worked 5 hours today` | `/work` | Date, hours, expected pay, employer from profile |
| `worked 5pm to 10:30 with 30 min break` | `/work` | Start/end, break, hours, pay |
| `Canara disbursed 450000` | `/loans` | Disbursement, new outstanding, interest-so-far |
| `how much on groceries this month` | `/dashboard` | Grocery tile, no confirm |

Confirm on that page writes. The list behind the card already shows the draft row (dimmed until confirm). After confirm it becomes real and the part-time (or spend) totals move.

If `/work` has no job profile yet, the same preview asks for employer, role, £/hour first, then the hours.

### Hours-only shifts

`worked 5 hours today` is valid. You do not have to give clock times.

```text
worked_minutes = hours × 60
expected_gross_minor = roundHalfUp(hours × hourly_rate_minor)
```

Clock-in/out remains optional when you type start and end instead.

### Till keypad (on the same Command page)

1. **Chips** — up to 6 `merchant + category + account` combos from the last 30 days.
2. **Keypad** — `inputmode="decimal"`. Save button: `Save £7.60 · Lidl · Cash`.
3. **Repeat last** — same merchant, amount, account; date = today.

Known chip under £50: Save on Command is enough; still jump to `/transactions` with an Undo toast so the section update is visible. AI-parsed and shift/loan lines always use the section preview.

### When the section preview is required

- Source is text/AI
- Type is shift, loan, transfer, edit, or delete
- Amount ≥ `confirm_threshold_minor` (default £50)
- Merchant is new

### Offline

- Structured keypad payloads queue in IndexedDB and flush on reconnect.
- Raw text while offline: “Will parse when you’re back.” No preview until parsed.
- Dashboard snapshot still shows the last hero.

---

## 7. Parsing

**Rules parser first** (no API):

```
amount + merchant + optional account (cash | card | forex | bank)
e.g. "7.60 lidl card"  "£4.20 bus"  "3.50 lidl cash"
"paid 3.5 pound cash at lidl for butter and curd" → Groq tail (items become the note; category groceries)
"worked 5 hours today" → hours-only shift (not an expense)
```

`merchant_rules`: `pattern → category_id, account_id`. Upsert on every confirmed save (chip, form, or AI). After two weeks, Lidl/Tesco/bus/Greggs should never hit Groq.

Do not grow this regex into a language. Anything else → Groq or the form.

**AI handles:** multi-item sentences, “paid X cash/card at … for …”, corrections, shifts from text, loan disbursement lines, “how much on groceries this week”, “can I spend £70”.

**Flow:** parse → Zod → resolve accounts → preview (amount, category, account, date, **effect on `safe_this_week`**) → `POST /api/command/confirm` with one-time token → undo toast.

**Token:** TTL 10 minutes, single use, hash of the preview payload. If data changed, reject and re-preview.

**On parse failure:** one repair call with the Zod error. Then stay on Command with the keypad/form pre-filled. Never a stack trace.

**Queries:** Groq returns intent + filters; SQL returns the number. Same for affordability.

**Timezone:** all “today / yesterday / this week” resolve in `Europe/London`.

---

## 8. Screens

### `/` Command

Full-screen text box (section 6). Recent commands under it. Chips + keypad. Empty state: “Type a spend or tap a chip. Example: 3.50 lidl cash”.

### `/dashboard`

- Hero: `safe_this_week` with colour band (comfortable / tight / stop). One-line why. Expand = six-component breakdown. Tap a component → contributing rows.
- **Daily safe spend** next to the hero (same formula as the why line): `floor(safe_this_week / max(1, days_until_payday))`.
- Stats row: spent today · spent this week · spent this month.
- **Monthly grocery** — sum of category `groceries` this London month, £ and ₹. Tap → those transactions. This is a first-class tile, not buried in a chart.
- **Cash vs card this month** — two numbers from account type, so parallel cash + bank is visible.
- Spend by category this month (simple bars or a table).
- Dual-currency: £ primary, ₹ muted; settings `inr_display = always | on_tap | never`.
- Compact converter: amount, direction, live `gbp_in_inr` / `inr_in_gbp`, `as_of` + source. Markup % and sparkline are **post-dogfood**.
- Nearest three commitments.
- Loan outstanding (INR + £ equivalent) as a **label**, not mixed into the hero.

After every confirmed write the dashboard numbers, transaction list, grocery month, account balances, `safe_this_week`, daily safe spend, and the data behind weekly/monthly mail all recompute from the ledger. No second manual step.

### `/transactions`

Search, filter date/category/account/type, edit, reverse (refund), CSV of current filter. Transfers visible but excluded from income/expense totals.

### `/accounts`

Landing week: you will spend **cash and forex first**. UK bank stays at £0 until you open it, then cash **and** card run in parallel. Each payment names the account. Moving leftover forex into the bank is a **transfer**, not income.

Seed (user can rename):

| Account | Currency | `include_in_safe_spend` | Typical use |
|---|---|---|---|
| Cash GBP | GBP | true | Day 1–n tills |
| Forex / travel card | GBP | true if it spends as GBP | Day 1–2, travel |
| UK bank | GBP | true | After account opening; card/contactless |
| Indian bank | INR | **false** | Home; not weekly spend |
| Cash INR | INR | **false** | Home |

Aliases the parser must know: `cash`, `forex`, `card`, `debit`, `bank`. `card` / `debit` resolve to UK bank once that account is in use; until then they resolve to forex.

Each row: current balance, last 5 txns. Archive, don’t delete. Optional statement-balance field; difference vs recorded is enough (no bank feed).

### `/budgets`

Monthly limits per category. Essential vs discretionary defaults:

- Essential: groceries, transport, mobile, laundry, health, rent, university
- Discretionary: eating out, entertainment, travel, miscellaneous

Rollover off by default. Warning at 80%. Safe-to-spend uses only essential leftover **not** already a commitment.

### `/work`

**Empty state (until you have a job):** one large button, **I got a part-time job**, *or* type it in Command (`got a job at Cafe X, barista, 12.50 an hour`). Either path saves employer, role, location, £/hour, then unlocks the tracker.

**After the offer:** you normally log hours from Command (`worked 5 hours today`). The page opens with a preview of the new shift on top of the day-wise list. Form remains as a fallback.

Day-wise cards, running hours this week/month, expected pay, received vs unpaid.

```text
# clock times, if given:
worked_minutes = actual_end − actual_start − unpaid_break
# hours-only text, if given instead:
worked_minutes = hours × 60
expected_gross_minor = roundHalfUp(worked_minutes / 60 × hourly_rate_minor)
```

No overtime split in V1. Overlapping times on the same day: warn, still save.

**Paid?** toggle → `recordTransaction()` income into the chosen account. Untick does not delete history; it reverses with a compensating row if within undo window, else a manual reverse.

Unpaid expected wages: shown on this page only. Never in `gbp_cash`.

### `/loans`

One education loan (Canara now; more later if needed). You type what was sanctioned and each amount **actually taken** (disbursement). Code computes interest. This page never feeds `gbp_cash`.

**You enter**

- Lender name, sanctioned amount (usually INR), annual interest rate (ROI in the Indian sense: 9.25% p.a., not “return on investment”), start date, optional moratorium end
- Each disbursement: amount, currency, date, note (e.g. tuition / living)
- Optional repayment or interest payment later

**Code computes** (simple interest on each disbursement during study — typical for Indian education loans in moratorium; not EMI)

```text
days_i     = today − disbursement_i.date   (London dates)
accrued_i  = roundHalfUp(principal_i_minor × annual_rate × days_i / 365)
interest_so_far = sum(accrued_i) − interest already paid
outstanding     = sum(disbursed) + interest_so_far − principal repaid
remaining_sanction = sanctioned − sum(disbursed)
```

Show INR as primary, £ as `convert` at **reference** `gbp_in_inr` (display only). Every projection shows the rate, day-count, and calculation date.

If a disbursement is paid **to you** (living costs) and you put it in UK cash/bank, log a **separate** income/transfer into that account. The loan event itself is liability, not spendable cash.

NL: “Canara disbursed 450000 rupees toward tuition” → preview loan event, not a grocery spend.

### `/commitments`

`kind`: `rent` | `fee` | `subscription` | `bill`  
`recurrence`: `once` | `weekly` | `monthly`  
Status: `upcoming` | `paid` | `skipped`

Store a **template** plus the **next occurrence** (`due_date`). When marked paid, roll `due_date` forward if recurring; do not reserve every future month.

Dashboard shows three nearest. Each row: days-until-due, covered badge, mark paid (opens Add sheet with amount/account prefilled).

### `/settings`

Name, timezone (locked London unless you change it), default account, `inr_display`, `confirm_threshold_minor`, `emergency_floor_minor`, `next_payday`, INR display, week start Monday, categories, Groq on/off, command log retention (default 30 days, structured intent preferred), export JSON, allowed login email.

---

## 9. FX (GBP ⇄ INR)

Do not scrape HTML. Reference rate from a JSON API, **twice a day**. The rate **you** got on a transfer matters more than mid-market.

Always keep both directions in cache (same fetch):

```text
gbp_in_inr  = rate           // 1 GBP = 110.3125 INR
inr_in_gbp  = 1 / rate       // 1 INR = 0.009065 GBP
as_of, source
```

Any screen can convert either way through `Money.convert`. Historical transactions keep `rate_used` and do not move.

| Concept | Source | Use |
|---|---|---|
| Reference | Latest `fx_rates` (manual override wins) | Display, converter, loan £ equivalent |
| Effective | User-entered on a transfer (₹ debited ÷ £ received) | That transfer only |
| Frozen | Copied onto the row at insert | History; never recomputed |

```sql
create table fx_rates (
  id           bigserial primary key,
  user_id      uuid not null references auth.users,
  base         char(3) not null default 'GBP',
  quote        char(3) not null default 'INR',
  rate         numeric(18,8) not null,
  source       text not null,  -- frankfurter | er-api | manual
  as_of        timestamptz not null,
  fetched_at   timestamptz not null default now(),
  unique (base, quote, source, as_of)
);
```

Append-only. Never update a rate row.

**Sources (keyless):** `api.frankfurter.dev` primary, `open.er-api.com` fallback. No third source in V1.

**Cron (Vercel Hobby):** one expression may run **at most once per day**. Use **two separate daily jobs**, never `6,16` in one expression:

```json
{
  "crons": [
    { "path": "/api/cron/fx", "schedule": "45 6 * * *" },
    { "path": "/api/cron/fx", "schedule": "45 16 * * *" },
    { "path": "/api/cron/digest", "schedule": "0 18 * * 0" }
  ]
}
```

UTC. 16:45 is after the ECB window. If deploy rejects two jobs on the same path, keep **16:45 only** and retry failed fetches on the next request to `/api/fx/latest`.

Job: Bearer `CRON_SECRET` → fetch primary (3s) → fallback → **reject if >5% vs last stored** (keep old, log) → insert → cache `fx_latest` `{ gbp_in_inr, inr_in_gbp, as_of, source }`. Pages never call the FX HTTP API.

Always show `as_of` and source next to a rate.

**V1 converter:** amount, direction (GBP→INR or INR→GBP), optional one markup % in settings. Sparkline, provider presets, and rate alerts: after three weeks of use.

---

## 10. AI adapter

Groq primary, Gemini Flash-Lite on 429/5xx. One interface:

```ts
parse<T>(input: { system: string; user: string; schema: ZodSchema<T> }): Promise<T>
```

Compact system prompt with **your** category and account names inlined. JSON only. Merchant names / pasted text wrapped as untrusted data.

Log `ai_command_logs`: provider, model, tokens, latency_ms, parse_ok. Do not log balances.

Ollama is laptop-only; not the phone path.

---

## 11. Schema (V1)

Every table: `id`, `user_id`, timestamps. RLS: `auth.uid() = user_id`. Prove with a **second** Supabase user before trusting it.

**Keep:** `users` (profile/settings columns or `user_settings`), `accounts`, `categories`, `transactions`, `budgets`, `commitments`, `employers` (name, role, location, default rate; **none** until “I got a job”), `shifts`, `loans`, `loan_events`, `fx_rates`, `merchant_rules`, `quick_add_templates`, `ai_command_logs`, `audit_events`, `confirmation_tokens`.

**Do not build:** `fee_plans`, `fee_installments`, `accommodation_plans`, `transaction_splits`, `goal_allocations`, `pay_record_shifts`, `attachments`, `grocery_items`, `product_prices`, `fx_alerts` (until post-dogfood).

**`transactions` minimum:** type, status, account_id, counterparty_account_id (transfers), amount_minor, currency, rate_used, rate_source, amount_inr_minor, category_id, merchant, note, occurred_at, essential_class, transfer_group_id, commitment_id, shift_id, client_id (idempotency), created_via (`add_sheet | form | ai | shift_paid | undo`).

**`shifts` minimum:** work_date, employer_name, actual_start, actual_end, unpaid_break_minutes, hourly_rate_minor, expected_gross_minor, paid, income_transaction_id.

**`commitments` minimum:** kind, title, amount_minor, currency, account_id (nullable), due_date, recurrence, status, linked_transaction_id.

**`loans` minimum:** name, sanctioned_minor, currency, annual_rate, start_date, moratorium_end.

**`loan_events` minimum:** loan_id, kind (`disbursement | repayment | interest_payment | rate_change`), amount_minor, currency, occurred_at, note. Interest-so-far is computed, not stored as the source of truth (cache on read is fine).

---

## 12. API

```
POST /api/command             rules parse, else AI; return preview + token; no write
POST /api/command/confirm     token + payload → recordTransaction()
POST /api/transactions        Add sheet / form → recordTransaction()
PATCH /api/transactions/:id   edit / reverse / undo
GET  /api/dashboard           hero, daily safe, grocery month, cash vs card, week/month spend, next dues, loan outstanding (one round trip)
GET  /api/fx/latest           gbp_in_inr, inr_in_gbp, as_of, source
POST /api/fx/convert          amount, direction, optional markup
POST /api/cron/fx             secret
POST /api/cron/digest         secret, Sunday
```

Rate-limit command and auth. Sunday digest: spent, grocery this month, vs budget, cash vs card, hours (if job exists), unpaid wages, dues next week, next `safe_this_week`, loan interest-so-far. On the 1st (or first Sunday) add a **month** block: opening/closing GBP cash, income, expense, grocery total. **No merchant lines** (email is cleartext).

Auth: Supabase magic link, allowlist one email. No PINs, CVVs, bank passwords.

---

## 13. Stack

Next.js App Router, TypeScript, Tailwind, Supabase (Postgres, Auth, no public storage in V1), Groq behind adapter, Zod, Recharts only if the dashboard needs one small spend chart (optional; table is enough), PWA manifest, Vercel Hobby, Resend free tier.

Modules stay importable (`finance`, `accounts`, `budgets`, `work`, `loans`, `commitments`, `assistant`) so `/finance` inside Vezora AI later is a move, not a rewrite. UI calls services, not tables.

---

## 14. Build order

| Day | Ship |
|---|---|
| 1 | Supabase, magic-link allowlist, RLS, `Money` + tests |
| 2 | Accounts, categories, transactions, manual Add sheet (no chips) |
| 3 | Transactions list, edit, reverse, CSV |
| 4 | `fx_rates`, cron, dual-currency render, freeze-on-insert |
| 5 | Tiny converter (`as_of` + source). Stop. |
| 6 | Budgets + cash-stack tests + dashboard hero |
| 7 | `merchant_rules`, chips, Repeat last |
| 8 | AI adapter, preview/confirm token, command box |
| 9 | Commitments + reserved folded into the hero |
| 10 | Work empty button + job profile + shifts + Paid → income |
| 11 | Loan + disbursements + interest-so-far (still excluded from hero) |
| 12 | Digest cron, PWA manifest, deploy, IndexedDB queue for Add-sheet JSON |

After day 12 the site is usable. Then **three weeks of real spending** before grocery inventory, product prices, sparkline, or a reports page.

---

## 15. Cost

| Service | Tier | £/mo |
|---|---|---|
| Vercel Hobby | Crons (daily expressions) | 0 |
| Supabase Free | Postgres + Auth | 0 |
| Groq | Free tier | 0 |
| FX | Keyless | 0 |
| Resend | 3k emails | 0 |
| Domain | Optional | ~£8/yr |

Gemini Flash-Lite as fallback stays under £1/month at this volume if Groq throttles.

---

## 16. V1 is done when

1. Chip → keypad → Save £x.xx on a phone in under 5 seconds.
2. `safe_this_week` matches a hand calculation from the six-name stack (use the worked example).
3. Every amount can show £ and ₹; old rows do not move when today’s rate moves.
4. Transfers do not change income or expense totals.
5. `/work` is a single **I got a job** button until a profile exists; then hours/pay match the minute formula; Paid posts income; unpaid is not in the hero.
6. “£3.50 cash Lidl” and “£2.30 card transport” debit the right accounts; grocery month and cash-vs-card stats match.
7. Loan: log a disbursement → interest-so-far and outstanding update; hero cash does not jump.
8. Rent/fee as commitments reserve once and do not also sit in `paced_essentials`.
9. Second Supabase user reads zero rows.
10. AI cannot write without a valid token; rules/chips never call Groq.
11. Add-sheet works queued offline and flushes once. NL may wait for signal.
12. Sunday digest arrives with totals + grocery month; no merchant list.

Not a ship gate: 14 perfect FX days, lock-screen widgets, sparkline, rate alerts, grocery inventory, Lidl prices.

---

## 17. Later (in order of daily value)

1. Grocery inventory + Lidl / product price history (your V2)  
2. FX sparkline + “rate above X” alert  
3. Nottingham fee/rent schedules if the single commitments table gets painful  
4. Second employer / pay matching  
5. EMI scenarios / rate-history chart on the loan  
6. Goals as allocations against GBP cash, not a second balance  
7. Push notifications  
8. Move modules under Vezora AI `/finance` and register tools with main Zara

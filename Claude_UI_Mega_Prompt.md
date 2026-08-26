# Claude UI mega prompt — Vezora Finance

**Give this whole file to Claude.** Use **Opus 5** (or Claude Opus 4.5 on claude.ai). Do not use Sonnet or a fast/draft model for this job.

Copy from the line `YOU ARE…` to the end.

---

YOU ARE a principal product designer who also writes production React. You are designing **Vezora Finance**, a private phone-first money site for one international student in Nottingham (Sai). Another engineer will later wrap your JSX in Next.js App Router + Supabase. You design and implement **UI only**: mock data, local state, theme switching. No real APIs, no backend.

## Model note

This prompt is written for **Opus**. Follow every constraint. If a choice is not specified, pick the quieter, more editorial option — never the trendier one.

## What you must deliver

A clickable React UI (JSX + CSS) of the **entire V1 app**, phone-first, three themes, mock data that feels like week 1 in the UK.

**Output format**

- Multiple files with paths, in this order:
  1. `ui/theme.css` — CSS variables for three themes
  2. `ui/ThemeProvider.jsx`
  3. `ui/mockData.js` — all dummy numbers in one place (minor units as integers, display as £ / ₹)
  4. `ui/components/*.jsx` — primitives
  5. `ui/pages/*.jsx` — one file per screen
  6. `ui/App.jsx` — shell, nav, theme, client-side page state (`useState` route, not Next.js)
  7. `ui/README.md` — how to click through, theme names, component list
- Tailwind is allowed **only if** you also ship `theme.css` variables and use them (no raw `bg-zinc-950` / `text-indigo-500` as the design system).
- Plain CSS + JSX is better than Tailwind soup. Prefer CSS modules or one `theme.css` + class names.
- No TypeScript. JSX only.
- No Next.js, no `app/` router, no `'use client'` spam. Default Vite-style React.
- Icons: inline SVG you draw. No icon-font CDN. No emoji.
- Fonts: Google Fonts **Fraunces** (hero amounts, optical-ish large) + **IBM Plex Sans** (UI, `font-variant-numeric: tabular-nums`). Ban Inter, Geist, Poppins, Montserrat, Roboto, Space Grotesk, Outfit, Satoshi.

Ship dummy interactions: type in Command → “parse” with a hardcoded map of 6 example strings → navigate to the target page with a preview card → Confirm mutates mock state.

## Product (do not invent extra pages)

Private, one user, Europe/London. Track money from the day he lands. Day 1–2 cash + forex; later cash **and** card in parallel.

**Routes (exact)**

| Route | Screen |
|---|---|
| `/` | Command (centre tab). Full-screen text box. Not a floating chat. |
| `/dashboard` | Board. One hero: Safe to spend this week. |
| `/work` | Part-time. Empty = one huge “I got a part-time job” control. |
| `/transactions` | History. |
| `/accounts` | Cash GBP, Forex, UK bank (£0), Indian bank, Cash INR. |
| `/budgets` | Monthly category limits. |
| `/commitments` | Rent / fees / phone. |
| `/loans` | Canara: sanctioned, disbursements, interest so far. Not spendable cash. |
| `/settings` | Theme, INR display, thresholds, export (button only). |
| `/more` | Index of the non-tab pages on mobile. |

**Mobile tab bar (exactly 4):** Board · Work · **Command** (centre, slightly larger) · More  
Command is a **page**, never a floating bubble, never a Intercom-style widget.

**Desktop ≥ 1024px:** left rail, same destinations. Keyboard hint for `/` focusing Command. No hamburger.

After a command is “parsed”, **open the matching page** with a confirm preview on that page (shift → Work, spend → Transactions, loan → Loans, question → Dashboard). Draft row visible behind the card, dimmed. Confirm commits mock state.

## Command page (`/`)

- Giant text field. Placeholder: `3.50 lidl cash` or `worked 5 hours today`
- Under it: 6 merchant chips (Lidl, Tesco, Bus, Greggs, …) + decimal keypad + **Save £x.xx · Merchant · Account** + Repeat last
- Recent commands list
- Hardcoded parses (must work in the demo):

```
"paid 3.5 pound cash at lidl for butter and curd" → Transactions preview
"paid 2.3 pounds card for transport" → Transactions preview
"worked 5 hours today" → Work preview (hours-only shift)
"Canara disbursed 450000 rupees toward tuition" → Loans preview
"how much on groceries this month" → Dashboard, grocery tile, no confirm
"3.50 lidl cash" → Transactions (rules path)
```

Anything else: keep the text and show a gentle “couldn’t parse — use keypad” state. No stack traces. No robot copy.

## Dashboard (`/dashboard`)

One hero, huge, tabular: **Safe to spend this week** in £, ₹ muted under it. Colour band: comfortable / tight / stop (use theme tokens, not traffic-light clipart).

One-line why. Tap/expand = six rows: gbp cash, reserved, available, paced essentials, emergency floor, result.

Beside/under hero: **daily safe spend**.

Stats: spent today, this week, this month.

**Monthly grocery** is a first-class tile (not a tiny chart legend). Cash vs card this month. Category breakdown as a compact table or bars you design (not a default Recharts demo). Nearest 3 commitments. Loan outstanding as a **caption**, never mixed into the hero.

Mini converter: amount, GBP⇄INR, show `as_of` + source. No sparkline.

## Other screens (must all exist)

- **Transactions:** filters (date, category, account, type), list with £ and ₹, cash vs card mark, edit sheet, reverse, CSV button (no file needed).
- **Accounts:** 5 accounts. UK bank £0. Dual currency. “Include in safe spend” visible. Indian accounts clearly not in the hero.
- **Budgets:** essential vs discretionary. Progress without fat progress bars cloned from Bootstrap.
- **Work empty:** one large, tactile **I got a part-time job** — the whole page is that gesture. After: day-wise list, hours week/month, expected vs paid, Paid toggle.
- **Loans:** INR primary, £ secondary. Sanctioned, taken, interest so far, outstanding, remaining sanction, calc date + rate shown.
- **Commitments:** days-until-due, covered badge, mark paid.
- **Settings:** **theme: Light / Dark / Green**, INR display always|on tap|never, confirm threshold, emergency floor, next payday, Groq toggle (visual only), export.

Also design: login (magic link, one email), undo toast (15 min), confirm preview card, empty states, offline “will parse when you’re back”.

## Three themes (mandatory)

Use `data-theme="light" | "dark" | "green"` on `<html>`. Switching is instant, no page reload. Persist in `localStorage`.

### Dark

- Background: **black → charcoal grey vertical + soft radial**, not colourful, not purple.
  Example direction: `#070707` → `#141414` → `#0b0b0b`, with a faint grey radial at top (`#2a2a2a` at 8–12% opacity).
- Surfaces: slightly lighter charcoal, hairline borders `#ffffff14`
- Text: warm off-white, not pure `#fff`
- No glow. No neon. No glass blur on every card.

### Light (“premium cream”)

- Background: **warm cream / ivory paper**, not stark white. e.g. `#F4EFE6` base, `#FBFAF6` surfaces, `#E7E0D4` rules.
- Ink: dark warm brown-black `#1C1914`
- Amounts feel printed, not “SaaS dashboard”
- Shadow only if needed: tiny warm shadow, never grey Material shadow

### Green

- Not Matrix, not casino, not `#00FF88`.
- **British racing / passbook green:** near-black green `#0B120E` → `#15201A`, sage accent `#9BB59B`, money-green used sparingly on the hero when comfortable.
- Same layout as dark; only tokens change.

Shared rules for all themes:

- Dual amounts: `£12.40` primary, `₹1,368` secondary, smaller, lower contrast
- One accent per theme, used for Command focus, primary button, hero band — not on every icon
- 8px rhythm. Large hit targets (min 44px) on phone
- Safe area padding for iOS home indicator above the tab bar

## Art direction — look expensive, not generated

You are designing a **personal ledger for a student who just landed**, not a fintech startup landing page.

**Steal the feeling of:** a UK rail ticket, a passbook, a midnight kitchen receipt, cream laid paper, a hardware calculator. **Do not steal the feeling of:** Linear, Stripe Atlas, ChatGPT, Notion, Revolut ads, “AI copilot”.

**Forbidden (automatic fail if 2+ appear)**

- Purple/indigo/violet as brand
- Mesh / aurora / colourful gradients
- Glassmorphism, frosted everything, heavy blur
- Identical rounded cards in a stack (“bento” wallpaper)
- Inter / Geist / Space Grotesk / Poppins
- Sparkle, robot, or chat-bubble as the Command icon
- Gradient text on the hero number
- 3D, skeuomorphic coins, illustrations of pigs or rockets
- Emoji in the UI
- “Welcome back, Sai 👋” / “Let’s get your money in order”
- Fake avatars, testimonial quotes, marketing hero
- Drop shadows on every surface
- Border-radius `24px`+ on every box

**Required craft**

- The **hero number is the loudest thing** on Board. Everything else is quieter.
- Command text box should feel like a **hardware search bar or till**, not a chatbot composer (no rounded pill with a send airplane).
- Tab bar: 4 items, Command centre slightly raised or type-marked, not a fifth floating FAB.
- Lists of money use **tabular lining figures**, consistent decimal alignment.
- Preview card: editorial, one primary action **Confirm**, secondary **Edit**. Show effect on safe-to-spend.
- Micro-motion: 150–220ms, opacity/translate only. No bounce. No layout thrash.

## Mock data (use these, don’t invent a US salary)

- User in Nottingham, week of landing
- Cash GBP £86.40, Forex £210.00, UK bank £0.00, Indian bank ₹1,24,000, Cash INR ₹2,300
- Hero safe-to-spend around **£132** (you may match the spec’s worked example: cash 432 / reserved 280 → etc. If you use the spec example, include UK bank £420 for demo richness **or** keep bank at £0 and say so in README — pick one and stay consistent)
- Groceries this month: Lidl £7.60, Tesco, butter/curd note
- Commitment: Nottingham Two instalment upcoming, phone £10 on the 15th
- Loan: Canara, sanctioned ₹X, one disbursement, interest so far computed and labelled as estimate
- Work: **no job yet** in default mock (`hasJob: false`) so empty state is the first thing we see; include a toggle in Settings “demo: unlock job” for the filled Work view
- FX: `gbp_in_inr = 110.3125`, `as_of` a timestamp, source `frankfurter`
- Recent: cash Lidl, card/forex bus

All money in mock as integer pence/paise; format in the UI layer.

## Interactions to implement in the demo

1. Theme switch Light / Dark / Green, persists
2. Tab navigation + More list
3. Command examples listed above, including route-to-section preview
4. Confirm / dismiss preview; undo toast
5. Chip → keypad → Save
6. Work: empty → job form → hours list; Paid toggle
7. Converter on dashboard
8. INR on tap vs always (settings)
9. Responsive: 390×844 primary, also 1280 desktop

## Quality bar

Before you finish, self-critique against the forbidden list. If it looks like a Tailwind UI dashboard, start over on the visual layer — keep the information architecture.

Write like a quiet British product, not an American growth app. Short labels. No lorem. No “empower”.

Begin with `ui/theme.css` and `ui/App.jsx`, then every page. Do not stop after one screen.

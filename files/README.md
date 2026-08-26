# Vezora Finance — UI

Clickable front end for the V1 app. One user, phone first, three themes, mock data
only. No network calls, no backend, no persistence beyond the theme choice.

## Run it

```bash
npm install
npm run dev
```

Open at 390 × 844 in device emulation for the intended experience. The desktop
layout takes over at 1024px.

There is also a flattened single-file build at `../Vezora_Finance_UI.jsx` for
sandboxes that only render one file. It is generated — edit the source here and
re-run `node build-preview.mjs` from the parent folder.

## The scene

Sai landed in Nottingham on Monday 24 August 2026. Term hasn't started, there's no
job yet, and the UK bank account is open but **empty (£0)** — the forex card is
doing all the work. Cash £86.40, forex £210.00, UK bank £0.00, Indian bank
₹1,24,000, cash at home ₹2,300.

Safe to spend comes out at **£132.40**, from £296.40 in hand less £120.00 reserved,
£34.00 of essentials paced for the rest of the week, and a £10.00 emergency floor.
Every figure on Board reconciles with the transactions and commitments in
`mockData.js` — change a number there and the hero moves.

## Click through it

Start on **Board**. Tap the "in hand, less spoken for" line to open the receipt
breakdown.

Then hit the **Command** key in the tab bar and type any of these — they all work:

| Type this | What happens |
|---|---|
| `paid 3.5 pound cash at lidl for butter and curd` | History, with a confirm card |
| `paid 2.3 pounds card for transport` | History, with a confirm card |
| `worked 5 hours today` | Work, with a shift confirm |
| `Canara disbursed 450000 rupees toward tuition` | Loan, with a disbursement confirm |
| `how much on groceries this month` | Board, grocery tile flagged, no confirm |
| `3.50 lidl cash` | History, via the rules path — no model needed |

Anything it can't read keeps your text and offers the keypad. Nothing is lost.

Other things worth trying:

- **Chip → keypad → Save.** Under £15 saves immediately; larger amounts route to a
  confirm card first. The threshold is in Settings.
- **Undo.** Every write drops a toast. Undo puts everything back.
- **Work is empty on purpose.** The whole page is one control. Add an employer, or
  flip *Settings → Demo → Unlock the job* for a filled view with three shifts and
  paid toggles.
- **Accounts.** Turn off "include in safe spend" for the forex card and watch the
  hero drop. Indian accounts are never included.
- **Settings → Rupees.** Switch between Always, On tap, and Never. On tap, amounts
  get a dotted underline and reveal when touched.
- **Settings → Offline.** Commands are held rather than parsed.
- **Desktop.** Press `/` anywhere to jump to Command.

## Themes

`data-theme` on `<html>`, switched instantly, remembered between sessions.

| Name | Reads as |
|---|---|
| `light` | Warm cream paper, ink brown-black, stamped oxblood accent |
| `dark` | Black to charcoal, warm off-white ink, till amber accent |
| `green` | Passbook green, sage accent, money green on a comfortable hero only |

All colour lives in `theme.css`. `app.css` only ever references tokens, so a fourth
theme is a new `[data-theme='…']` block and nothing else.

## Files

```
theme.css            tokens for the three themes
app.css              every component class, tokens only
format.js            gbp / inr / conversion / dates — minor units in, strings out
mockData.js          all dummy numbers, integers in pence and paise
parse.js             the command parser (rules; the model is the fallback)
store.jsx            state, derived money figures, mutations, undo
ThemeProvider.jsx    writes data-theme, persists
App.jsx              shell, route state, keyboard shortcut, tab bar and rail

components/
  Icons.jsx          hand-drawn inline SVG, hairline
  Primitives.jsx     Label Section Row Button Chip Seg Switch SettingRow Tile
                     Leader Empty Sheet Bar Mark
  Amount.jsx         dual-currency figure, honours the rupee setting
  Keypad.jsx         decimal keypad + toMinor()
  PreviewCard.jsx    confirm card, always states the effect on safe-to-spend
  Toast.jsx          undo toast
  TopBar.jsx         route title, date stamp, offline strip
  TabBar.jsx         4-key tab bar + desktop Rail

pages/
  Command.jsx  Dashboard.jsx  Work.jsx  Transactions.jsx  Accounts.jsx
  Budgets.jsx  Commitments.jsx  Loans.jsx  Settings.jsx  More.jsx  Login.jsx
```

## Notes for whoever wraps this in Next.js

- **Money is never a float.** Everything is an integer in minor units and only
  becomes a string in `format.js`. Keep that boundary.
- **`store.jsx` is a stand-in.** Its derived values — `safe`, `reserved`,
  `dailySafe`, `loanFigures`, `shiftFigures` — are the calculations the server
  should own. The shapes are the contract; the arithmetic is already correct.
- **`localStorage` is wrapped** in a try/catch that falls back to memory. A money
  app shouldn't break because storage is unavailable.
- **Every mutation snapshots first.** `capture()` / `restore()` is the undo model —
  in production that becomes an append-only audit entry, not a state rollback.
- **The parser is deliberately dumb.** `parse.js` is the rules layer that runs
  before any model call. The model handles what falls through, and its output
  still has to survive schema validation before it reaches a preview card.
- **Nothing writes without a preview** except quick-add under the confirm
  threshold. Keep that rule when the real API lands.

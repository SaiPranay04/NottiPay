# Vezora Finance — Standalone Website Specification

> **Build from [`Vezora_Finance_V1_Final.md`](./Vezora_Finance_V1_Final.md).** This file is the long-term product map (Vezora AI, loans, full work tracker, extra pages). Do not implement deferred V1 pages from here.

**Document status:** Product and implementation plan  
**Version:** 1.0  
**Primary user:** Sai Pranay  
**Initial deployment:** Private, single-user web application  
**Long-term destination:** Finance module inside Vezora AI, monitored through Zara

## 1. Product Vision

Vezora Finance is a private, mobile-first website for managing personal finances through natural language. The user should be able to open the website and type ordinary sentences such as:

> Paid £7.60 at Lidl for milk, vegetables and bread using my UK debit card.

The system extracts the relevant information, displays a structured preview, asks for confirmation when data will change, and then updates all affected records. Traditional pages remain available for reviewing, correcting and analysing data, but routine usage should be possible from the main Zara command box.

The initial product will be tested as a standalone website. Its business logic and database design must remain modular so it can later become the `/finance` section of Vezora AI without a rewrite.

## 2. Product Principles

1. **Text first:** Most actions can be completed using one natural-language input.
2. **Confirm before mutation:** Creating, editing or deleting financial data requires a preview and confirmation.
3. **Code performs calculations:** Balances, interest, wages, budgets and conversions are calculated deterministically, never guessed by an LLM.
4. **Explain every number:** Dashboard values should link to the underlying transactions or formula.
5. **Separate owned money from borrowed money:** Loan availability must never be presented as freely spendable cash.
6. **Mobile first:** Daily expense and shift entry should take only a few seconds on a phone.
7. **Modular architecture:** Finance, loans, fees and part-time work remain independent domains connected through validated services.
8. **Privacy by default:** Store financial records, not banking credentials. Send only minimum necessary context to the AI provider.

## 3. Main Navigation and Pages

| Page | Route | Primary purpose |
|---|---|---|
| Zara Command Centre | `/` | Enter transactions, shifts, commitments and questions in natural language |
| Dashboard | `/dashboard` | See the complete current financial position |
| Transactions | `/transactions` | Review, search, edit and export income and expenses |
| Accounts | `/accounts` | Track balances across cash, cards, banks and forex accounts |
| Budgets | `/budgets` | Set category limits and monitor safe spending |
| Part-Time Work | `/work` | Record shifts, hours, wages and payment status |
| Loans | `/loans` | Track Canara loan sanction, disbursements, interest and projections |
| University Fees | `/fees` | Track tuition, scholarship, deposit and instalments |
| Accommodation | `/accommodation` | Track Nottingham Two payments and upcoming instalments |
| Commitments | `/commitments` | Manage future and recurring payments |
| Goals | `/goals` | Track emergency fund, laptop fund and other savings goals |
| Reports | `/reports` | Weekly/monthly analysis and downloadable exports |
| Notifications | `/notifications` | Review upcoming payments, budget warnings and anomalies |
| Settings | `/settings` | Configure profile, categories, currencies, AI and security |

## 4. Zara Command Centre

### 4.1 Purpose

This is the default landing page and the fastest way to interact with the system. It contains a large command box, recent commands, suggested actions and a preview/confirmation panel.

### 4.2 Supported commands

- Expense: “Spent £4.20 on the bus using my debit card.”
- Income: “Received £145 salary from Café ABC.”
- Transfer: “Moved £100 from forex card to UK bank.”
- Balance adjustment: “My cash balance is now £26.”
- Shift entry: “Worked at Café ABC today from 5 pm to 10:30 pm with a 30-minute break at £12.50 per hour.”
- Fee payment: “Paid £2,705 to Nottingham Two from my UK bank.”
- Loan event: “Canara Bank disbursed ₹4,50,000 toward tuition.”
- Commitment: “My phone plan renews for £10 on the 15th of every month.”
- Correction: “Change yesterday’s Lidl expense from £12 to £10.80.”
- Query: “How much did I spend on groceries this week?”
- Affordability: “Can I safely spend £70 on an Edinburgh trip next month?”

### 4.3 Command processing workflow

1. Receive text from the user.
2. Detect the action and extract structured fields using Groq.
3. Validate the response against a strict schema.
4. Resolve referenced accounts, employers or existing records.
5. Ask a short follow-up only if a required field is missing or ambiguous.
6. Show the proposed change and its financial effect.
7. Save only after confirmation.
8. Recalculate affected balances, budgets and reports.
9. Show a success message with an Undo action.

### 4.4 Confirmation rules

- Read-only questions require no confirmation.
- Create, edit and delete operations require confirmation in Version 1.
- Every preview shows amount, currency, category, account, date and effect on balance.
- Bulk operations show all affected records before saving.
- Undo remains available for a short period and creates an audit entry rather than silently erasing history.

## 5. Dashboard

The dashboard provides the current financial position at a glance.

### Summary cards

- Total available cash across personal accounts
- Money already reserved for tuition, accommodation and commitments
- Genuinely free-to-spend amount
- Spending today, this week and this month
- Income this month
- Part-time earnings: expected, received and unpaid
- Remaining monthly budget
- Safe daily spending allowance
- Total loan disbursed and estimated outstanding amount
- Upcoming payment nearest to its due date

### Visual sections

- Spending by category
- Daily spending trend
- Budget versus actual
- Income versus expenses
- Part-time hours and earnings trend
- Savings-goal progress
- Upcoming commitments timeline

Every card and chart must support drill-down into its contributing records.

## 6. Transactions Page

### Transaction types

- Expense
- Income
- Transfer
- Refund
- Balance adjustment
- Fee payment
- Accommodation payment
- Loan disbursement
- Loan repayment or interest payment

### Features

- Search by text, merchant or note
- Filter by date, category, account, currency and type
- Sort by date or amount
- View transaction detail and audit history
- Edit, duplicate, split or reverse a transaction
- Attach an optional receipt later
- Mark expense as essential, useful or discretionary
- Add tags such as university, travel or one-time setup
- Export the current filtered view to CSV/Excel
- Detect possible duplicates

Transfers move value between accounts and must not count as income or expense.

## 7. Accounts Page

Initial account types:

- UK bank account
- Cash in GBP
- Forex/travel card
- Indian bank account
- Cash in INR
- Education loan account
- Savings reserve

Each account shows current balance, available balance, currency, recent activity and reconciliation status. The user can archive an account without deleting its history.

The system distinguishes:

- **Current balance:** Recorded money in the account
- **Reserved amount:** Money allocated to known commitments
- **Available balance:** Current balance minus reservations
- **Net personal funds:** Personal assets excluding undisbursed loan eligibility

## 8. Budgets Page

### Budget capabilities

- Monthly category limits
- Weekly optional limits
- Fixed and flexible categories
- Rollover enabled or disabled per category
- Warning thresholds at configurable percentages
- Budget versus actual comparison
- Projected month-end spending
- Safe daily allowance based on remaining flexible budget and days remaining
- Essential versus discretionary split
- Identification of repeated small expenses

Suggested initial categories include groceries, transport, eating out, mobile/Wi-Fi, laundry, university, health, entertainment, travel and miscellaneous.

## 9. Part-Time Work Tracker

### 9.1 Purpose

The Part-Time Work page tracks employment day by day, calculates expected wages, reconciles actual payments and connects earnings to the wider financial system.

### 9.2 Page tabs

1. **Overview** — Current week/month hours, expected wages, received wages and unpaid amount
2. **Shifts** — Day-wise shift list and calendar
3. **Employers** — Employer details, rates and pay schedule
4. **Pay Records** — Payslips and received payments
5. **Analytics** — Trends, comparisons and projections

### 9.3 Employer profile

Each employer can store:

- Employer name
- Role/job title
- Work location
- Default hourly rate
- Overtime rate and rule, if applicable
- Default break policy
- Pay frequency: weekly, fortnightly or monthly
- Typical payday
- Employment start/end date
- Active or archived status
- Optional notes

No payroll passwords, government-account credentials or unnecessary identity documents are stored.

### 9.4 Shift record

Each day-wise shift includes:

- Work date
- Employer
- Role/location
- Scheduled start and end time
- Actual start and end time
- Unpaid break duration
- Paid break duration, if relevant
- Regular hours
- Overtime hours
- Hourly rate applied
- Overtime rate applied
- Tips or bonuses
- Expected gross pay
- Actual received amount, once paid
- Payment status: scheduled, completed, approved, partially paid, paid or disputed
- Notes such as “covered additional closing shift”

### 9.5 Automatic calculations

The application calculates:

```text
worked_minutes = actual_end - actual_start - unpaid_break
regular_pay = regular_hours × hourly_rate
overtime_pay = overtime_hours × overtime_rate
expected_gross = regular_pay + overtime_pay + tips + bonuses
payment_difference = actual_received - expected_gross
```

All calculations use integer minutes and decimal-safe money arithmetic to avoid floating-point errors.

### 9.6 Day-wise and calendar views

- Daily shift cards with hours and earnings
- Weekly calendar with scheduled versus completed shifts
- Monthly calendar with daily earnings
- Running weekly and monthly hour totals
- Running expected-income total
- Highlight overlapping shifts or impossible times
- Optional warning when configured weekly hours are exceeded

### 9.7 Pay reconciliation

When salary is received, the user can type:

> Received £142.50 from Café ABC for shifts from 3–9 October.

The system proposes matching the payment to unpaid shifts. The user confirms the selected shifts before they are marked paid. It then shows:

- Expected pay
- Actual received pay
- Difference
- Included shifts
- Pay period
- Optional deductions
- Remaining unpaid wages

Partial payments are supported. A payment may cover multiple shifts, and one shift may be covered by more than one payment.

### 9.8 Work analytics

- Total hours by day, week and month
- Average hours per week
- Regular versus overtime hours
- Expected versus received earnings
- Effective hourly earnings
- Earnings by employer
- Unpaid or disputed amount
- Projected month-end earnings
- Earnings allocated to living expenses, emergency fund or goals

### 9.9 Connections to finance

- Confirmed salary creates an income transaction in the selected account.
- Tips can be recorded as cash income.
- Unpaid expected wages appear in work reports but not in bank balance.
- Projected earnings are clearly labelled and never counted as available money.
- Salary allocations can optionally distribute received money among spending, emergency savings and goals.

## 10. Loans Page

The Loans page tracks the Canara education loan and supports future loans if needed.

### Features

- Sanctioned amount in INR
- Interest rate and rate-history entries
- Moratorium details
- Amount disbursed and remaining sanction
- Disbursement events linked to tuition, accommodation or living costs
- User-funded margin contribution
- Deposit reimbursement status
- Interest accrued during study and moratorium
- Estimated balance at graduation
- EMI scenario calculator
- Actual and reference GBP/INR conversion rates
- Planned versus actual disbursement schedule

Official figures remain distinguishable from application projections. Every projection displays assumptions and calculation date.

## 11. University Fees Page

### Initial Nottingham structure

- Tuition fee
- Scholarship deduction
- £4,500 deposit paid from personal funds
- Remaining tuition balance
- 34% / 33% / 33% instalment plan, editable to match official invoices
- Amount paid personally
- Amount paid from loan disbursement
- Due, requested, processing and paid statuses
- GBP value, actual INR debit and exchange rate used

Each fee payment may link to a transaction, loan disbursement and supporting reference.

## 12. Accommodation Page

This page separately tracks Nottingham Two rather than mixing accommodation with university fees.

- Total tenancy cost
- Deposit or advance, if applicable
- Instalment schedule
- Due dates
- Payment status
- Payment account and transaction link
- Amount remaining
- Upcoming-payment reminder
- Difference between expected and actual payment

## 13. Commitments Page

Commitments include fixed future or recurring expenses:

- Tuition instalments
- Accommodation instalments
- Mobile plan
- Wi-Fi/device access
- Transport pass
- Subscriptions
- Insurance or university charges

Each commitment stores expected amount, due date, recurrence, reservation status, linked transaction and reminder preferences. Reserved commitments reduce the genuinely free-to-spend amount.

## 14. Goals Page

Initial goals may include:

- Emergency fund
- Laptop or equipment fund
- Travel fund
- Loan-interest contribution

Each goal shows target amount, saved amount, remaining amount, target date, projected completion and linked transfers. Moving money into a goal changes its allocation but is not an expense.

## 15. Reports Page

### Weekly report

- Total spent and received
- Category breakdown
- Budget status
- Part-time shifts, hours and expected/received earnings
- Unusual or duplicate transactions
- Upcoming commitments
- Recommended safe spending for the next week

### Monthly report

- Opening and closing balances
- Income and expense totals
- Savings rate
- Budget performance
- Essential versus discretionary spending
- Work hours and wage reconciliation
- Loan and fee activity
- Goal progress
- Month-over-month comparison

### Exports

- CSV/Excel transactions
- Part-time shift and wage report
- Loan disbursement report
- Fee schedule
- Complete JSON backup

## 16. Notifications Page

Notification types:

- Upcoming commitment
- Budget threshold reached
- Unusually high expense
- Possible duplicate
- Shift missing an end time
- Expected payday passed without payment
- Received wage differs from expected wage
- Loan or fee deadline approaching
- Savings goal reached

Notifications are generated through deterministic rules. Groq may explain them conversationally but does not decide the underlying financial fact.

## 17. Settings Page

### Profile and preferences

- Name and timezone
- Default currency: GBP
- Secondary currency: INR
- Date, time and number formats
- Week start day

### Finance configuration

- Categories and tags
- Default accounts
- Budget warning thresholds
- Exchange-rate sources and manual overrides
- Employers and wage rules

### AI controls

- Enable/disable natural-language parsing
- Groq model selection through a server-side adapter
- Minimum-context mode
- Zero Data Retention reminder/status
- Command-history retention preference

### Security

- Allowed login email
- Multi-factor authentication
- Active sessions
- Sign out all devices
- Audit history
- Data export and account deletion

## 18. Data Model Overview

Core entities:

- `users`
- `accounts`
- `categories`
- `transactions`
- `transaction_splits`
- `budgets`
- `commitments`
- `goals`
- `goal_allocations`
- `employers`
- `shifts`
- `pay_records`
- `pay_record_shifts`
- `loans`
- `loan_rate_history`
- `loan_disbursements`
- `fee_plans`
- `fee_installments`
- `accommodation_plans`
- `notifications`
- `attachments`
- `audit_events`
- `ai_command_logs`

All user-owned tables include `user_id`. Supabase Row-Level Security must restrict every row to the authenticated owner.

## 19. AI Tool Boundary

Zara/Groq interacts with validated application tools, not raw database access.

Example tools:

- `proposeTransaction`
- `createConfirmedTransaction`
- `findTransactions`
- `proposeShift`
- `createConfirmedShift`
- `matchPayToShifts`
- `getWorkSummary`
- `getAvailableBalance`
- `getBudgetStatus`
- `getUpcomingCommitments`
- `calculateLoanProjection`

Every tool receives schema-validated inputs. Write tools require a short-lived confirmation token produced from the preview shown to the user.

## 20. Security and Privacy Requirements

- Never store card PINs, CVVs, OTPs, bank passwords or internet-banking credentials.
- Restrict authentication to the user’s approved email.
- Enable multi-factor authentication.
- Enforce Row-Level Security on every user table and private-storage object.
- Keep Groq and Supabase privileged keys server-side only.
- Send Groq only the minimum fields required for the current command.
- Enable Groq Zero Data Retention when available.
- Rate-limit command and authentication endpoints.
- Validate all AI output with strict schemas.
- Maintain an append-only audit trail for important changes.
- Prevent AI instructions embedded in receipt/document text from invoking tools.
- Require re-authentication for exporting or deleting all data.
- Store no raw voice in the standalone Version 1.

## 21. Technical Architecture

### Stack

- Next.js App Router and TypeScript
- Tailwind CSS with accessible light/dark themes
- Supabase PostgreSQL, Auth and private Storage
- Groq API behind an internal AI-provider adapter
- Zod schemas for command and API validation
- Recharts for dashboard visualisation
- Decimal-safe financial calculations
- Vercel deployment and scheduled jobs
- Progressive Web App manifest for phone installation

### Architectural modules

```text
src/modules/
  assistant/
  finance/
  accounts/
  budgets/
  work/
  loans/
  fees/
  accommodation/
  commitments/
  goals/
  reports/
  notifications/
```

Each module owns its validation, business rules and repository functions. UI components call application services rather than writing directly to tables.

## 22. Responsive Experience

### Mobile

- Bottom navigation for Home, Dashboard, Add, Work and More
- Sticky command box
- Large touch targets
- One-handed quick expense and shift entry
- Installable PWA

### Desktop

- Collapsible left navigation
- Multi-column dashboard
- Keyboard shortcut to focus Zara input
- Dense tables with filtering and export

## 23. Development Roadmap

### Phase 1 — Reliable finance core

- Authentication and security policies
- Accounts, categories and transactions
- Zara text input with preview and confirmation
- Dashboard and budgets
- GBP/INR support
- Audit log and CSV export

### Phase 2 — Part-time work

- Employers and shift entry
- Day/week/month hour totals
- Wage calculations
- Pay reconciliation
- Salary-to-transaction connection
- Work analytics and exports

### Phase 3 — Education finance

- Loan tracker
- University fees
- Nottingham Two accommodation
- Commitments and reserved-money calculation
- Loan/fee projections

### Phase 4 — Intelligence and convenience

- Goals and automatic allocations
- Weekly/monthly reports
- Notifications
- Receipt extraction
- PWA offline queue for unsaved commands

### Phase 5 — Vezora AI integration

- Move standalone modules under Vezora AI navigation
- Register finance and work tools with main Zara
- Add voice input and spoken summaries
- Add cross-module briefings with groceries, university, calendar and tasks
- Keep sensitive actions confirmed on phone or screen

## 24. Version 1 Acceptance Criteria

Version 1 is ready for real use when:

1. A user can type an expense, confirm it and see all balances update correctly.
2. Transfers do not inflate income or expenses.
3. Budget and safe-spending values reconcile exactly with transactions.
4. A shift can be entered in text or form and its hours/pay are calculated correctly.
5. Salary can be matched to one or more shifts without counting expected wages as available cash.
6. Loan, tuition and accommodation are displayed as separate concepts.
7. All user tables pass Row-Level Security tests.
8. AI output cannot bypass validation or confirmation.
9. Transactions and work records can be exported.
10. The site works comfortably on phone and desktop.

## 25. Deferred Features

The following are intentionally postponed until the standalone system is reliable:

- Always-listening voice hardware
- Wake-word detection
- Direct bank integrations
- Automatic bank payments
- Grocery inventory and meal planning
- Gmail/calendar access
- Multi-user family accounts
- Full autonomous Zara actions

This keeps the first product safe, testable and useful while preserving the path toward the complete Vezora AI assistant.

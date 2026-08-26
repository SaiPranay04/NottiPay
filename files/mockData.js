// ---------------------------------------------------------------
// Every dummy number in the app lives here.
// Amounts are integers in minor units: pence for GBP, paise for INR.
// Scene: Sai landed in Nottingham on Mon 24 Aug 2026. Term hasn't
// started. No job yet. UK bank account opened but empty (£0) — the
// forex card is doing the work.
// ---------------------------------------------------------------

export const TODAY = '2026-08-27'; // Thursday
export const NOW = '2026-08-27T18:20:00';

export const fx = {
  pair: 'GBP/INR',
  rate: 110.3125, // 1 GBP = 110.3125 INR
  asOf: '2026-08-27T16:00:00',
  source: 'frankfurter',
  nextCheck: '2026-08-28T06:45:00',
};

export const profile = {
  name: 'Sai',
  email: 'sai@vezora.dev',
  city: 'Nottingham',
  course: 'MSc, University of Nottingham',
  tz: 'Europe/London',
  landedOn: '2026-08-24',
};

export const settings = {
  theme: 'light',
  inrDisplay: 'always', // always | tap | never
  confirmThreshold: 1500, // £15.00 — under this, saves without a confirm step
  emergencyFloor: 1000, // £10.00
  pacedEssentials: 3400, // £34.00 pencilled in for the rest of this week
  nextPayday: '2026-09-15', // next money in — loan living-cost draw
  weekEndsOn: '2026-08-30', // Sunday
  monthEndsOn: '2026-08-31',
  groqEnabled: true,
  offline: false,
  demoJob: false,
};

export const accounts = [
  {
    id: 'acc_cash_gbp',
    name: 'Cash',
    kind: 'cash',
    currency: 'GBP',
    balance: 8640,
    includeInSafeSpend: true,
    note: 'Notes and coins',
  },
  {
    id: 'acc_forex',
    name: 'Forex card',
    kind: 'card',
    currency: 'GBP',
    balance: 21000,
    includeInSafeSpend: true,
    note: 'Loaded before flying',
  },
  {
    id: 'acc_uk_bank',
    name: 'UK bank',
    kind: 'bank',
    currency: 'GBP',
    balance: 0,
    includeInSafeSpend: true,
    note: 'Opened 25 Aug — nothing in it yet',
  },
  {
    id: 'acc_in_bank',
    name: 'Indian bank',
    kind: 'bank',
    currency: 'INR',
    balance: 12400000,
    includeInSafeSpend: false,
    note: 'Home account — not spendable here',
  },
  {
    id: 'acc_cash_inr',
    name: 'Cash (INR)',
    kind: 'cash',
    currency: 'INR',
    balance: 230000,
    includeInSafeSpend: false,
    note: 'Left in the drawer at home',
  },
];

export const categories = [
  { id: 'groceries', name: 'Groceries', essential: true },
  { id: 'transport', name: 'Transport', essential: true },
  { id: 'phone', name: 'Phone', essential: true },
  { id: 'laundry', name: 'Laundry', essential: true },
  { id: 'eatingout', name: 'Eating out', essential: false },
  { id: 'setup', name: 'Setting up', essential: false },
  { id: 'university', name: 'University', essential: false },
  { id: 'misc', name: 'Misc', essential: false },
];

export const transactions = [
  {
    id: 't10',
    date: '2026-08-27',
    merchant: 'Tesco Express',
    category: 'groceries',
    accountId: 'acc_cash_gbp',
    amount: 960,
    type: 'expense',
    note: 'Rice, eggs, oats',
  },
  {
    id: 't9',
    date: '2026-08-27',
    merchant: 'Bus — Nottingham City Transport',
    category: 'transport',
    accountId: 'acc_forex',
    amount: 230,
    type: 'expense',
    note: '',
  },
  {
    id: 't8',
    date: '2026-08-26',
    merchant: 'Lidl',
    category: 'groceries',
    accountId: 'acc_cash_gbp',
    amount: 1240,
    type: 'expense',
    note: 'Weekly shop',
  },
  {
    id: 't7',
    date: '2026-08-26',
    merchant: 'Lebara — SIM starter',
    category: 'phone',
    accountId: 'acc_forex',
    amount: 1000,
    type: 'expense',
    note: '',
  },
  {
    id: 't6',
    date: '2026-08-26',
    merchant: 'Greggs',
    category: 'eatingout',
    accountId: 'acc_cash_gbp',
    amount: 285,
    type: 'expense',
    note: '',
  },
  {
    id: 't5',
    date: '2026-08-25',
    merchant: 'Bus — Nottingham City Transport',
    category: 'transport',
    accountId: 'acc_forex',
    amount: 230,
    type: 'expense',
    note: '',
  },
  {
    id: 't4',
    date: '2026-08-25',
    merchant: 'Lidl',
    category: 'groceries',
    accountId: 'acc_cash_gbp',
    amount: 760,
    type: 'expense',
    note: 'Butter and curd',
  },
  {
    id: 't3',
    date: '2026-08-24',
    merchant: 'Wilko — bedding, kettle',
    category: 'setup',
    accountId: 'acc_forex',
    amount: 2600,
    type: 'expense',
    note: 'One-off',
  },
  {
    id: 't2',
    date: '2026-08-24',
    merchant: 'Tesco Express',
    category: 'groceries',
    accountId: 'acc_forex',
    amount: 1485,
    type: 'expense',
    note: 'First shop',
  },
  {
    id: 't1',
    date: '2026-08-24',
    merchant: 'Tram — airport to Beeston',
    category: 'transport',
    accountId: 'acc_forex',
    amount: 320,
    type: 'expense',
    note: '',
  },
];

export const budgets = [
  { categoryId: 'groceries', limit: 12000 },
  { categoryId: 'transport', limit: 6000 },
  { categoryId: 'phone', limit: 1200 },
  { categoryId: 'laundry', limit: 1500 },
  { categoryId: 'eatingout', limit: 4000 },
  { categoryId: 'setup', limit: 15000 },
  { categoryId: 'university', limit: 3000 },
  { categoryId: 'misc', limit: 3000 },
];

export const commitments = [
  {
    id: 'c1',
    name: 'Tram + bus, 4-week pass',
    kind: 'transport',
    amount: 6200,
    currency: 'GBP',
    dueDate: '2026-08-31',
    recurrence: 'Every 4 weeks',
    reserved: true,
    status: 'unpaid',
  },
  {
    id: 'c2',
    name: 'Course materials deposit',
    kind: 'university',
    amount: 4800,
    currency: 'GBP',
    dueDate: '2026-09-02',
    recurrence: 'One-off',
    reserved: true,
    status: 'unpaid',
  },
  {
    id: 'c3',
    name: 'Phone plan — Lebara',
    kind: 'phone',
    amount: 1000,
    currency: 'GBP',
    dueDate: '2026-09-15',
    recurrence: 'Monthly, 15th',
    reserved: true,
    status: 'unpaid',
  },
  {
    id: 'c4',
    name: 'Nottingham Two — instalment 1',
    kind: 'accommodation',
    amount: 138200,
    currency: 'GBP',
    dueDate: '2026-10-03',
    recurrence: '3 instalments',
    reserved: false,
    status: 'unpaid',
  },
  {
    id: 'c5',
    name: 'Tuition — instalment 2',
    kind: 'fees',
    amount: 528000,
    currency: 'GBP',
    dueDate: '2027-01-15',
    recurrence: '34 / 33 / 33',
    reserved: false,
    status: 'unpaid',
  },
];

export const loan = {
  lender: 'Canara Bank',
  ref: 'EDU/NOTT/2026',
  sanctioned: 220000000, // ₹22,00,000
  ratePct: 9.85,
  moratorium: 'Course + 6 months',
  calcDate: '2026-08-27',
  disbursements: [
    {
      id: 'd1',
      date: '2026-08-12',
      amount: 45000000, // ₹4,50,000
      purpose: 'Tuition — instalment 1',
      rateUsed: 111.4,
    },
  ],
};

export const employerTemplate = {
  id: 'emp1',
  name: 'Riverside Kitchen',
  role: 'Front of house',
  location: 'Beeston',
  rate: 1260, // £12.60/hr
  payFrequency: 'Fortnightly',
  payday: 'Friday',
};

export const demoShifts = [
  {
    id: 's3',
    date: '2026-08-27',
    employerId: 'emp1',
    minutes: 300,
    breakMinutes: 0,
    rate: 1260,
    paid: false,
    note: 'Hours only — typed in',
  },
  {
    id: 's2',
    date: '2026-08-26',
    employerId: 'emp1',
    minutes: 330,
    breakMinutes: 30,
    rate: 1260,
    paid: false,
    note: '',
  },
  {
    id: 's1',
    date: '2026-08-25',
    employerId: 'emp1',
    minutes: 240,
    breakMinutes: 0,
    rate: 1260,
    paid: true,
    note: 'Trial shift',
  },
];

// Six most-used combinations, learned from history. One tap, no AI.
export const quickChips = [
  { label: 'Lidl', categoryId: 'groceries', accountId: 'acc_cash_gbp', last: 1240 },
  { label: 'Tesco', categoryId: 'groceries', accountId: 'acc_cash_gbp', last: 960 },
  { label: 'Bus', categoryId: 'transport', accountId: 'acc_forex', last: 230 },
  { label: 'Greggs', categoryId: 'eatingout', accountId: 'acc_cash_gbp', last: 285 },
  { label: 'Tram', categoryId: 'transport', accountId: 'acc_forex', last: 320 },
  { label: 'Laundry', categoryId: 'laundry', accountId: 'acc_cash_gbp', last: 350 },
];

export const recentCommands = [
  { text: '3.50 lidl cash', at: '2026-08-27T09:12:00', result: 'Saved' },
  { text: 'paid 2.3 pounds card for transport', at: '2026-08-27T08:41:00', result: 'Saved' },
  { text: 'how much on groceries this month', at: '2026-08-26T21:05:00', result: 'Answered' },
];

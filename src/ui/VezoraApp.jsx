'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import { matchAccount } from '@/lib/account-alias';


/* ======== format.js ======== */
// Formatting only. Every amount in the app is an integer in minor units
// (pence for GBP, paise for INR) and is turned into a string here.

function gbp(minor, { sign = false, pence = true } = {}) {
  const neg = minor < 0;
  const v = Math.abs(minor);
  const whole = Math.floor(v / 100);
  const rest = v % 100;
  const grouped = whole.toLocaleString('en-GB');
  const body = pence ? `${grouped}.${String(rest).padStart(2, '0')}` : grouped;
  const s = neg ? '−' : sign ? '+' : '';
  return `${s}£${body}`;
}

// Indian grouping: ₹1,24,000 — not ₹124,000.
function inr(minor, { paise = false } = {}) {
  const neg = minor < 0;
  const v = Math.abs(minor);
  const whole = Math.floor(v / 100);
  const rest = v % 100;
  const s = String(whole);
  let grouped;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    const head = s.slice(0, -3);
    grouped = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  const body = paise ? `${grouped}.${String(rest).padStart(2, '0')}` : grouped;
  return `${neg ? '−' : ''}₹${body}`;
}

// pence × (INR per GBP) = paise
function toInr(gbpMinor, rate) {
  return Math.round(gbpMinor * rate);
}
function toGbp(inrMinor, rate) {
  return Math.round(inrMinor / rate);
}

function money(minor, currency, rate) {
  return currency === 'INR' ? inr(minor) : gbp(minor);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function d(iso) {
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
}

function shortDate(iso) {
  const x = d(iso);
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

function longDate(iso) {
  const x = d(iso);
  return `${DAYS[x.getDay()]} ${x.getDate()} ${MONTHS[x.getMonth()]}`;
}

function stampDate(iso) {
  const x = d(iso);
  return `${DAYS[x.getDay()]} ${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]}`;
}

function dayLabel(iso, todayIso) {
  if (iso === todayIso) return 'Today';
  const t = d(todayIso);
  t.setDate(t.getDate() - 1);
  const y = t.toISOString().slice(0, 10);
  if (iso === y) return 'Yesterday';
  return longDate(iso);
}

function daysBetween(fromIso, toIso) {
  const a = d(fromIso);
  const b = d(toIso);
  return Math.round((b - a) / 86400000);
}

function clockStamp(iso) {
  const x = new Date(iso);
  const hh = String(x.getHours()).padStart(2, '0');
  const mm = String(x.getMinutes()).padStart(2, '0');
  return `${shortDate(x.toISOString().slice(0, 10))} ${hh}:${mm}`;
}

function hoursLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* ======== mockData.js ======== */
// ---------------------------------------------------------------
// Every dummy number in the app lives here.
// Amounts are integers in minor units: pence for GBP, paise for INR.
// Scene: Sai landed in Nottingham on Mon 24 Aug 2026. Term hasn't
// started. No job yet. UK bank account opened but empty (£0) — the
// forex card is doing the work.
// ---------------------------------------------------------------

const TODAY = '2026-08-27'; // Thursday
const NOW = '2026-08-27T18:20:00';

const fx = {
  pair: 'GBP/INR',
  rate: 110.3125, // 1 GBP = 110.3125 INR
  asOf: '2026-08-27T16:00:00',
  source: 'frankfurter',
  nextCheck: '2026-08-28T06:45:00',
};

const profile = {
  name: 'Sai',
  email: 'sai@vezora.dev',
  city: 'Nottingham',
  course: 'MSc, University of Nottingham',
  tz: 'Europe/London',
  landedOn: '2026-08-24',
};

const settings = {
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

const accounts = [
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

const categories = [
  { id: 'groceries', name: 'Groceries', essential: true },
  { id: 'transport', name: 'Transport', essential: true },
  { id: 'phone', name: 'Phone', essential: true },
  { id: 'laundry', name: 'Laundry', essential: true },
  { id: 'eatingout', name: 'Eating out', essential: false },
  { id: 'setup', name: 'Setting up', essential: false },
  { id: 'university', name: 'University', essential: false },
  { id: 'misc', name: 'Misc', essential: false },
];

const transactions = [
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

const budgets = [
  { categoryId: 'groceries', limit: 12000 },
  { categoryId: 'transport', limit: 6000 },
  { categoryId: 'phone', limit: 1200 },
  { categoryId: 'laundry', limit: 1500 },
  { categoryId: 'eatingout', limit: 4000 },
  { categoryId: 'setup', limit: 15000 },
  { categoryId: 'university', limit: 3000 },
  { categoryId: 'misc', limit: 3000 },
];

const commitments = [
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

const loan = {
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

const employerTemplate = {
  id: 'emp1',
  name: 'Riverside Kitchen',
  role: 'Front of house',
  location: 'Beeston',
  rate: 1260, // £12.60/hr
  payFrequency: 'Fortnightly',
  payday: 'Friday',
};

const demoShifts = [
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
const quickChips = [
  { label: 'Lidl', categoryId: 'groceries', accountId: 'acc_cash_gbp', last: 1240 },
  { label: 'Tesco', categoryId: 'groceries', accountId: 'acc_cash_gbp', last: 960 },
  { label: 'Bus', categoryId: 'transport', accountId: 'acc_forex', last: 230 },
  { label: 'Greggs', categoryId: 'eatingout', accountId: 'acc_cash_gbp', last: 285 },
  { label: 'Tram', categoryId: 'transport', accountId: 'acc_forex', last: 320 },
  { label: 'Laundry', categoryId: 'laundry', accountId: 'acc_cash_gbp', last: 350 },
];

const recentCommands = [
  { text: '3.50 lidl cash', at: '2026-08-27T09:12:00', result: 'Saved' },
  { text: 'paid 2.3 pounds card for transport', at: '2026-08-27T08:41:00', result: 'Saved' },
  { text: 'how much on groceries this month', at: '2026-08-26T21:05:00', result: 'Answered' },
];

const mock = { TODAY, NOW, fx, profile, settings, accounts, categories, transactions, budgets, commitments, loan, employerTemplate, demoShifts, quickChips, recentCommands };

/* ======== parse.js ======== */
// The demo parser. In production this is the rules-first layer that runs
// before any model call — regex + a learned merchant table. Most daily
// entries never reach the model.

const MERCHANTS = {
  lidl: { merchant: 'Lidl', category: 'groceries', account: 'acc_cash_gbp' },
  tesco: { merchant: 'Tesco Express', category: 'groceries', account: 'acc_cash_gbp' },
  aldi: { merchant: 'Aldi', category: 'groceries', account: 'acc_cash_gbp' },
  greggs: { merchant: 'Greggs', category: 'eatingout', account: 'acc_cash_gbp' },
  bus: { merchant: 'Bus — Nottingham City Transport', category: 'transport', account: 'acc_forex' },
  tram: { merchant: 'Tram', category: 'transport', account: 'acc_forex' },
  transport: { merchant: 'Transport', category: 'transport', account: 'acc_forex' },
  laundry: { merchant: 'Laundry', category: 'laundry', account: 'acc_cash_gbp' },
  boots: { merchant: 'Boots', category: 'misc', account: 'acc_forex' },
};

const ACCOUNT_WORDS = {
  cash: 'acc_cash_gbp',
  card: 'acc_forex',
  forex: 'acc_forex',
  bank: 'acc_uk_bank',
};

const CATEGORY_WORDS = {
  groceries: 'groceries',
  grocery: 'groceries',
  food: 'groceries',
  transport: 'transport',
  travel: 'transport',
  bus: 'transport',
  phone: 'phone',
  laundry: 'laundry',
  eating: 'eatingout',
  university: 'university',
};

const clean = (s) =>
  s
    .toLowerCase()
    .replace(/[£]/g, ' £ ')
    .replace(/[.,!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const pence = (n) => Math.round(parseFloat(n) * 100);

function lookup(word) {
  if (!word) return null;
  const key = Object.keys(MERCHANTS).find((k) => word.includes(k));
  return key ? MERCHANTS[key] : null;
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseCommand(text) {
  const t = clean(text);
  if (!t) return { ok: false, reason: 'empty' };

  // --- question -------------------------------------------------------
  let m = t.match(/^how much (?:did i |have i )?(?:spen[dt] )?on ([a-z ]+?)(?: this (week|month))?$/);
  if (m) {
    const cat = CATEGORY_WORDS[m[1].trim().split(' ')[0]] || m[1].trim();
    return {
      ok: true,
      kind: 'question',
      route: '/dashboard',
      draft: { category: cat, period: m[2] || 'month' },
      echo: text,
    };
  }

  // --- shift ----------------------------------------------------------
  m = t.match(/^worked ([\d.]+) ?(?:hours?|hrs?|h)(?: (today|yesterday))?/);
  if (m) {
    return {
      ok: true,
      kind: 'shift',
      route: '/work',
      draft: { minutes: Math.round(parseFloat(m[1]) * 60), when: m[2] || 'today' },
      echo: text,
    };
  }

  // --- loan disbursement ----------------------------------------------
  m = t.match(
    /^(canara|bank)?\s*disbursed ([\d,]+) (?:rupees|inr|rs)(?: (?:toward|towards|for) (.+))?$/
  );
  if (m) {
    return {
      ok: true,
      kind: 'loan',
      route: '/loans',
      draft: {
        amount: Math.round(parseFloat(m[2].replace(/,/g, '')) * 100),
        purpose: m[3] ? titleCase(m[3]) : 'General',
      },
      echo: text,
    };
  }

  // --- sentence expense: "paid 3.5 pound cash at lidl for butter and curd"
  m = t.match(
    /^(?:paid|spent|spend) (?:£ )?([\d.]+) ?(?:pounds?|quid|£)? ?(cash|card|forex|bank)?(?: at ([a-z' ]+?))?(?: (?:for|on) (.+))?$/
  );
  if (m) {
    const [, amt, acctWord, at, forWhat] = m;
    const hit = lookup(at) || lookup(forWhat);
    const category =
      hit?.category ||
      (forWhat && CATEGORY_WORDS[forWhat.trim().split(' ')[0]]) ||
      'misc';
    const merchant = at ? titleCase(at.trim()) : hit?.merchant || (forWhat ? titleCase(forWhat) : 'Unlabelled');
    return {
      ok: true,
      kind: 'expense',
      route: '/transactions',
      draft: {
        amount: pence(amt),
        merchant: hit && at ? hit.merchant : merchant,
        category,
        accountId: ACCOUNT_WORDS[acctWord] || hit?.account || 'acc_forex',
        note: at && forWhat ? titleCase(forWhat) : '',
      },
      echo: text,
    };
  }

  // --- rules path: "3.50 lidl cash" ------------------------------------
  m = t.match(/^(?:£ )?([\d]+(?:\.[\d]{1,2})?) ([a-z' ]+?)(?: (cash|card|forex|bank))?$/);
  if (m) {
    const [, amt, word, acctWord] = m;
    const hit = lookup(word);
    return {
      ok: true,
      kind: 'expense',
      via: 'rules',
      route: '/transactions',
      draft: {
        amount: pence(amt),
        merchant: hit?.merchant || titleCase(word.trim()),
        category: hit?.category || CATEGORY_WORDS[word.trim().split(' ')[0]] || 'misc',
        accountId: ACCOUNT_WORDS[acctWord] || hit?.account || 'acc_cash_gbp',
        note: '',
      },
      echo: text,
    };
  }

  return { ok: false, reason: 'nomatch', echo: text };
}

const EXAMPLES = [
  'paid 3.5 pound cash at lidl for butter and curd',
  'paid 2.3 pounds card for transport',
  'worked 5 hours today',
  'Canara disbursed 450000 rupees toward tuition',
  'how much on groceries this month',
  '3.50 lidl cash',
];

/* ======== store.jsx ======== */
// localStorage is wrapped: some preview sandboxes block it, and a
// money app should never fall over because storage is unavailable.
const memory = {};
const store = {
  get(k, fallback) {
    try {
      const v = window.localStorage.getItem(k);
      return v === null ? fallback : v;
    } catch {
      return k in memory ? memory[k] : fallback;
    }
  },
  set(k, v) {
    memory[k] = v;
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* in-memory only */
    }
  },
};

const Ctx = createContext(null);
const useStore = () => useContext(Ctx);

let seq = 100;
const nextId = (p) => `${p}${++seq}`;

function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);
  const [accounts, setAccounts] = useState(mock.accounts);
  const [transactions, setTransactions] = useState(mock.transactions);
  const [commitments, setCommitments] = useState(mock.commitments);
  const [loan, setLoan] = useState(mock.loan);
  const [categories, setCategories] = useState(mock.categories);
  const [budgets, setBudgets] = useState(mock.budgets);
  const [profile, setProfile] = useState(mock.profile);
  const [today, setToday] = useState(mock.TODAY);
  const [now, setNow] = useState(mock.NOW);
  const [settings, setSettings] = useState({
    ...mock.settings,
    theme: store.get('vf.theme', mock.settings.theme),
  });
  const [employer, setEmployer] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [toast, setToast] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [undoLiveId, setUndoLiveId] = useState(null);
  const [fx, setFx] = useState(mock.fx);

  const rate = fx.rate;
  const monthKey = today.slice(0, 7);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fxRes = await fetch('/api/fx/latest');
        const liveFx = await fxRes.json();
        if (!cancelled && liveFx?.gbp_in_inr) {
          setFx({
            pair: 'GBP/INR',
            rate: liveFx.gbp_in_inr,
            asOf: liveFx.as_of,
            source: liveFx.source,
            nextCheck: liveFx.next_check || mock.fx.nextCheck,
          });
        }
      } catch {
        /* keep the last known rate */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (cancelled || !data || data.mode !== 'live') return;
        setLive(true);
        setAuthEmail(data.email || null);
        setAccounts(data.accounts);
        setTransactions(data.transactions);
        setCommitments(data.commitments);
        if (data.loan) setLoan(data.loan);
        if (data.categories?.length) setCategories(data.categories);
        if (data.budgets?.length) setBudgets(data.budgets);
        if (data.profile) setProfile({ ...mock.profile, ...data.profile });
        setToday(data.today);
        setNow(new Date().toISOString());
        setSettings((s) => ({
          ...s,
          ...data.settings,
          theme: s.theme,
          offline: false,
          demoJob: false,
        }));
      } catch {
        /* stay on the in-browser demo */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- derived ----------------------------------------------------

  const spendable = useMemo(
    () =>
      accounts
        .filter((a) => a.currency === 'GBP' && a.includeInSafeSpend)
        .reduce((n, a) => n + a.balance, 0),
    [accounts]
  );

  const reservedList = useMemo(
    () =>
      commitments.filter(
        (c) =>
          c.reserved &&
          c.status === 'unpaid' &&
          c.currency === 'GBP' &&
          daysBetween(today, c.dueDate) <= daysBetween(today, settings.nextPayday || today)
      ),
    [commitments, settings.nextPayday, today]
  );

  const reserved = useMemo(() => reservedList.reduce((n, c) => n + c.amount, 0), [reservedList]);

  const safe = Math.max(
    0,
    spendable - reserved - settings.pacedEssentials - settings.emergencyFloor,
  );

  const daysLeftInWeek = Math.max(1, daysBetween(today, settings.weekEndsOn) + 1);
  const dailySafe = Math.round(safe / daysLeftInWeek);

  const band = dailySafe >= 2500 ? 'ok' : dailySafe >= 1200 ? 'tight' : 'stop';

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);

  const spentToday = useMemo(
    () => expenses.filter((t) => t.date === today).reduce((n, t) => n + t.amount, 0),
    [expenses, today]
  );
  const spentWeek = useMemo(
    () =>
      expenses
        .filter((t) => daysBetween(t.date, today) <= 6 && daysBetween(t.date, today) >= 0)
        .reduce((n, t) => n + t.amount, 0),
    [expenses, today]
  );
  const spentMonth = useMemo(
    () => expenses.filter((t) => t.date.startsWith(monthKey)).reduce((n, t) => n + t.amount, 0),
    [expenses, monthKey]
  );

  const byCategory = useMemo(() => {
    const map = {};
    expenses
      .filter((t) => t.date.startsWith(monthKey))
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return categories
      .map((c) => ({ ...c, spent: map[c.id] || 0 }))
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [expenses, categories, monthKey]);

  const cashVsCard = useMemo(() => {
    let cash = 0;
    let card = 0;
    expenses
      .filter((t) => t.date.startsWith(monthKey))
      .forEach((t) => {
        const acc = accounts.find((a) => a.id === t.accountId);
        if (acc && acc.kind === 'cash') cash += t.amount;
        else card += t.amount;
      });
    return { cash, card };
  }, [expenses, accounts, monthKey]);

  const groceriesMonth = byCategory.find((c) => c.id === 'groceries')?.spent || 0;

  const upcoming = useMemo(
    () =>
      commitments
        .filter((c) => c.status === 'unpaid')
        .slice()
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [commitments]
  );

  const loanFigures = useMemo(() => {
    const taken = (loan.disbursements || []).reduce((n, x) => n + x.amount, 0);
    // Simple interest accrued during the moratorium, to the calc date.
    const interest = (loan.disbursements || []).reduce((n, x) => {
      const days = daysBetween(x.date, loan.calcDate);
      return n + Math.round((x.amount * (loan.ratePct / 100) * days) / 365);
    }, 0);
    return {
      taken,
      interest,
      outstanding: taken + interest,
      remaining: loan.sanctioned - taken,
    };
  }, [loan]);

  const shiftFigures = useMemo(() => {
    const paidMin = (s) => s.minutes - s.breakMinutes;
    const pay = (s) => Math.round((paidMin(s) * s.rate) / 60);
    const week = shifts.filter((s) => daysBetween(s.date, today) <= 6);
    return {
      pay,
      paidMin,
      weekMinutes: week.reduce((n, s) => n + paidMin(s), 0),
      monthMinutes: shifts.reduce((n, s) => n + paidMin(s), 0),
      expected: shifts.reduce((n, s) => n + pay(s), 0),
      received: shifts.filter((s) => s.paid).reduce((n, s) => n + pay(s), 0),
    };
  }, [shifts, today]);

  // ---- mutations ---------------------------------------------------

  const capture = useCallback(
    () => setSnapshot({ accounts, transactions, commitments, loan, shifts, employer }),
    [accounts, transactions, commitments, loan, shifts, employer]
  );

  const restore = useCallback(async () => {
    if (live && undoLiveId) {
      const id = undoLiveId;
      setUndoLiveId(null);
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast({ id: nextId('k'), text: 'Could not undo', undo: false });
        return;
      }
      setTransactions((xs) => xs.filter((t) => t.id !== id));
      if (data?.accounts) setAccounts(data.accounts);
      setToast({ id: nextId('k'), text: 'Reverted', undo: false });
      return;
    }
    if (!snapshot) return;
    setAccounts(snapshot.accounts);
    setTransactions(snapshot.transactions);
    setCommitments(snapshot.commitments);
    setLoan(snapshot.loan);
    setShifts(snapshot.shifts);
    setEmployer(snapshot.employer);
    setSnapshot(null);
    setToast({ id: nextId('k'), text: 'Reverted', undo: false });
  }, [snapshot, live, undoLiveId]);

  const say = (text, undo = true) => setToast({ id: nextId('k'), text, undo });

  const addTransaction = async (t) => {
    if (live) {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_minor: t.amount,
          account_id: t.accountId,
          category: t.category,
          merchant: t.merchant,
          note: t.note || '',
          occurred_at: t.date || today,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.transaction) {
        say('Could not save — try again', false);
        return null;
      }
      setTransactions((xs) => [data.transaction, ...xs]);
      if (data.accounts) setAccounts(data.accounts);
      setUndoLiveId(data.transaction.id);
      say(`Saved — ${data.transaction.merchant}`);
      return data.transaction;
    }
    capture();
    const tx = { id: nextId('t'), type: 'expense', note: '', ...t };
    setTransactions((xs) => [tx, ...xs]);
    setAccounts((xs) =>
      xs.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a))
    );
    say(`Saved — ${tx.merchant}`);
    return tx;
  };

  const reverseTransaction = async (id) => {
    if (live) {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        say('Could not reverse', false);
        return;
      }
      const tx = transactions.find((t) => t.id === id);
      setTransactions((xs) => xs.filter((t) => t.id !== id));
      if (data?.accounts) setAccounts(data.accounts);
      say(`Reversed — ${tx?.merchant || 'entry'}`);
      return;
    }
    capture();
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    setTransactions((xs) => xs.filter((t) => t.id !== id));
    setAccounts((xs) =>
      xs.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + tx.amount } : a))
    );
    say(`Reversed — ${tx.merchant}`);
  };

  const updateTransaction = async (id, patch) => {
    if (live) {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          amount_minor: patch.amount,
          merchant: patch.merchant,
          category: patch.category,
          note: patch.note,
          account_id: patch.accountId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.transaction) {
        say('Could not update', false);
        return;
      }
      setTransactions((xs) => xs.map((t) => (t.id === id ? data.transaction : t)));
      if (data.accounts) setAccounts(data.accounts);
      say('Updated');
      return;
    }
    capture();
    const before = transactions.find((t) => t.id === id);
    setTransactions((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (before && patch.amount != null && patch.amount !== before.amount) {
      const delta = patch.amount - before.amount;
      setAccounts((xs) =>
        xs.map((a) => (a.id === before.accountId ? { ...a, balance: a.balance - delta } : a))
      );
    }
    say('Updated');
  };

  const startJob = (e) => {
    capture();
    setEmployer({ ...mock.employerTemplate, ...e, id: 'emp1' });
    say(`Job added — ${e.name || mock.employerTemplate.name}`);
  };

  const addShift = (s) => {
    capture();
    if (!employer) setEmployer({ ...mock.employerTemplate, ...(s.employer || {}) });
    setShifts((xs) => [{ id: nextId('s'), breakMinutes: 0, paid: false, note: '', ...s }, ...xs]);
    say('Shift saved');
  };

  const toggleShiftPaid = (id) => {
    capture();
    let becamePaid = false;
    setShifts((xs) =>
      xs.map((s) => {
        if (s.id !== id) return s;
        becamePaid = !s.paid;
        return { ...s, paid: !s.paid };
      })
    );
    const s = shifts.find((x) => x.id === id);
    if (s) {
      const amount = Math.round(((s.minutes - s.breakMinutes) * s.rate) / 60);
      const bank = matchAccount(accounts, 'acc_uk_bank');
      setAccounts((xs) =>
        xs.map((a) =>
          a.id === (bank?.id || 'acc_uk_bank')
            ? { ...a, balance: a.balance + (becamePaid ? amount : -amount) }
            : a
        )
      );
      say(becamePaid ? 'Marked paid — added to UK bank' : 'Marked unpaid');
    }
  };

  const addDisbursement = (dis) => {
    capture();
    setLoan((l) => ({
      ...l,
      disbursements: [{ id: nextId('d'), rateUsed: rate, ...dis }, ...l.disbursements],
    }));
    say('Disbursement recorded');
  };

  const markCommitmentPaid = (id) => {
    capture();
    const c = commitments.find((x) => x.id === id);
    setCommitments((xs) => xs.map((x) => (x.id === id ? { ...x, status: 'paid' } : x)));
    if (c && c.currency === 'GBP') {
      const forex = matchAccount(accounts, 'acc_forex');
      const accountId = forex?.id || 'acc_forex';
      const draft = {
        amount: c.amount,
        merchant: c.name,
        category: c.kind === 'fees' ? 'university' : c.kind,
        accountId,
        date: today,
        note: 'Commitment',
      };
      if (live) {
        addTransaction(draft);
      } else {
        setAccounts((xs) =>
          xs.map((a) => (a.id === accountId ? { ...a, balance: a.balance - c.amount } : a))
        );
        setTransactions((xs) => [
          {
            id: nextId('t'),
            type: 'expense',
            ...draft,
          },
          ...xs,
        ]);
      }
    }
    say('Marked paid');
  };

  const toggleInclude = async (id) => {
    const current = accounts.find((a) => a.id === id);
    const next = current ? !current.includeInSafeSpend : false;
    setAccounts((xs) =>
      xs.map((a) => (a.id === id ? { ...a, includeInSafeSpend: !a.includeInSafeSpend } : a))
    );
    if (live) {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, include_in_safe_spend: next }),
      });
      if (!res.ok) {
        setAccounts((xs) =>
          xs.map((a) => (a.id === id ? { ...a, includeInSafeSpend: !next } : a))
        );
        say('Could not update account', false);
      }
    }
  };

  const setAccountBalance = async (id, balance) => {
    setAccounts((xs) => xs.map((a) => (a.id === id ? { ...a, balance } : a)));
    if (live) {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, balance_minor: balance }),
      });
      if (!res.ok) say('Could not update balance', false);
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const setSetting = (k, v) => {
    setSettings((s) => ({ ...s, [k]: v }));
    if (k === 'theme') store.set('vf.theme', v);
    if (k === 'demoJob') {
      if (v) {
        setEmployer(mock.employerTemplate);
        setShifts(mock.demoShifts);
      } else {
        setEmployer(null);
        setShifts([]);
      }
    }
    if (live && (k === 'emergencyFloor' || k === 'confirmThreshold' || k === 'inrDisplay')) {
      const body = {};
      if (k === 'emergencyFloor') body.emergency_floor_minor = v;
      if (k === 'confirmThreshold') body.confirm_threshold_minor = v;
      if (k === 'inrDisplay') body.inr_display = v;
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    }
  };

  const value = {
    // data
    accounts,
    transactions,
    commitments,
    loan,
    settings,
    employer,
    shifts,
    categories,
    budgets,
    quickChips: mock.quickChips,
    recentCommands: mock.recentCommands,
    profile,
    fx,
    rate,
    today,
    now,
    ready,
    live,
    authEmail,
    // derived
    spendable,
    reserved,
    reservedList,
    safe,
    safeInr: toInr(safe, rate),
    dailySafe,
    daysLeftInWeek,
    band,
    spentToday,
    spentWeek,
    spentMonth,
    byCategory,
    cashVsCard,
    groceriesMonth,
    upcoming,
    loanFigures,
    shiftFigures,
    hasJob: !!employer,
    // actions
    addTransaction,
    reverseTransaction,
    updateTransaction,
    addShift,
    startJob,
    toggleShiftPaid,
    addDisbursement,
    markCommitmentPaid,
    toggleInclude,
    setAccountBalance,
    setSetting,
    signOut,
    toast,
    setToast,
    restore,
    say,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ======== ThemeProvider.jsx ======== */
const THEMES = [
  { id: 'light', name: 'Light', hint: 'Cream paper' },
  { id: 'dark', name: 'Dark', hint: 'Charcoal' },
  { id: 'green', name: 'Green', hint: 'Passbook' },
];

function ThemeProvider({ children }) {
  const { settings } = useStore();

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-theme', settings.theme);
    store.set('vf.theme', settings.theme);
  }, [settings.theme]);

  return children;
}

/* ======== components/Icons.jsx ======== */
// Hairline geometry only. Drawn to sit with tabular figures, not to decorate.
const S = ({ children, size = 20, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

// Board — a ruled ledger page with one figure set to the right margin
const IconBoard = (p) => (
  <S {...p}>
    <path d="M4 4h16v16H4z" />
    <path d="M7 9h6M7 12.5h4M14 16h3" />
  </S>
);

// Work — a punched timecard
const IconWork = (p) => (
  <S {...p}>
    <path d="M5 4h14v16H5z" />
    <path d="M9 4v3M15 4v3" />
    <path d="M8 13h8M8 16.5h5" />
  </S>
);

// More — a stub index, rules of decreasing length
const IconMore = (p) => (
  <S {...p}>
    <path d="M4 7h16M4 12h11M4 17h7" />
  </S>
);

const IconChevron = (p) => (
  <S {...p}>
    <path d="m9 5 7 7-7 7" />
  </S>
);

const IconBack = (p) => (
  <S {...p}>
    <path d="m15 5-7 7 7 7" />
  </S>
);

const IconCheck = (p) => (
  <S {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </S>
);

const IconClose = (p) => (
  <S {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </S>
);

const IconSwap = (p) => (
  <S {...p}>
    <path d="M7 8h10l-3-3M17 16H7l3 3" />
  </S>
);

const IconFilter = (p) => (
  <S {...p}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </S>
);

const IconDownload = (p) => (
  <S {...p}>
    <path d="M12 4v10M8 11l4 4 4-4M5 19h14" />
  </S>
);

const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

const IconWallet = (p) => (
  <S {...p}>
    <path d="M4 7h16v12H4z" />
    <path d="M4 7l12-3v3" />
    <path d="M15 13h3" />
  </S>
);

const IconCal = (p) => (
  <S {...p}>
    <path d="M4 6h16v14H4z" />
    <path d="M4 10h16M9 4v4M15 4v4" />
  </S>
);

const IconScale = (p) => (
  <S {...p}>
    <path d="M12 4v16M6 9h12" />
    <path d="M4 15h4l-2-6zM16 15h4l-2-6z" />
  </S>
);

const IconGear = (p) => (
  <S {...p}>
    <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5z" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </S>
);

const IconOffline = (p) => (
  <S {...p} size={16}>
    <path d="M4 8h16M6 12h12M9 16h6" />
    <path d="m4 4 16 16" />
  </S>
);

const IconLoan = (p) => (
  <S {...p}>
    <path d="M4 5h16v14H4z" />
    <path d="M4 9h16" />
    <path d="M8 13h8M8 16h4" />
  </S>
);

/* ======== components/Primitives.jsx ======== */
const Label = ({ children, accent = false, style }) => (
  <span className={accent ? 'label label--accent' : 'label'} style={style}>
    {children}
  </span>
);

const Section = ({ title, aside, children }) => (
  <section className="section">
    <div className="section__head">
      <Label>{title}</Label>
      {aside ? <span className="caption">{aside}</span> : null}
    </div>
    {children}
  </section>
);

const Row = ({ title, sub, end, onClick, draft = false, marks = null }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`row${onClick ? ' row--tap' : ''}${draft ? ' row--draft' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="row__main">
        <span className="row__title">{title}</span>
        {sub ? (
          <span className="row__sub">
            {sub}
            {marks}
          </span>
        ) : null}
      </span>
      <span className="row__end">{end}</span>
    </Tag>
  );
};

const Button = ({
  children,
  variant = '',
  block = false,
  lg = false,
  onClick,
  disabled,
  type = 'button',
}) => (
  <button
    type={type}
    className={`btn${variant ? ` btn--${variant}` : ''}${block ? ' btn--block' : ''}${
      lg ? ' btn--lg' : ''
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Chip = ({ children, on = false, onClick }) => (
  <button type="button" className={`chip${on ? ' chip--on' : ''}`} onClick={onClick}>
    {children}
  </button>
);

const Seg = ({ options, value, onChange }) => (
  <div className="seg" role="tablist">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        className={`seg__opt${value === o.value ? ' seg__opt--on' : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Switch = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`switch${on ? ' switch--on' : ''}`}
    onClick={() => onChange(!on)}
  >
    <i />
  </button>
);

const SettingRow = ({ title, note, control }) => (
  <div className="row">
    <span className="row__main">
      <span className="row__title">{title}</span>
      {note ? <span className="row__sub">{note}</span> : null}
    </span>
    <span className="row__end">{control}</span>
  </div>
);

const Tile = ({ children, sunk = false, flag = false, style }) => (
  <div className={`tile${sunk ? ' tile--sunk' : ''}${flag ? ' tile--flag' : ''}`} style={style}>
    {children}
  </div>
);

// receipt-style leader line: label ......... figure
const Leader = ({ k, v, total = false }) => (
  <div className={`led${total ? ' led--total' : ''}`}>
    <span className="led__k">{k}</span>
    <span className="led__fill" />
    <span className="led__v">{v}</span>
  </div>
);

const Empty = ({ title, children }) => (
  <div className="empty">
    <p className="empty__title">{title}</p>
    <div>{children}</div>
  </div>
);

const Sheet = ({ title, onClose, children }) => (
  <div className="scrim" onClick={onClose}>
    <div
      className="sheet"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet__grip" />
      <div className="spread">
        <Label>{title}</Label>
        <button className="btn btn--ghost" onClick={onClose} aria-label="Close" style={{ minHeight: 32 }}>
          <IconClose size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Bar = ({ pct, tone = '' }) => (
  <div className="bar">
    <div
      className={`bar__fill${tone ? ` bar__fill--${tone}` : ''}`}
      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
    />
  </div>
);

const Mark = ({ children, cash = false }) => (
  <span className={`mark${cash ? ' mark--cash' : ''}`}>{children}</span>
);

/* ======== components/Amount.jsx ======== */
// Primary figure in GBP, secondary in INR — smaller, lower contrast.
// Setting decides whether the INR line is always shown, revealed on tap,
// or never shown at all.
function Amount({
  minor,
  currency = 'GBP',
  size = 'md',
  tone = '',
  inline = false,
  showInr = true,
  sign = false,
}) {
  const { settings, rate } = useStore();
  const [revealed, setRevealed] = useState(false);

  const mode = settings.inrDisplay;
  const isGbp = currency === 'GBP';
  const primary = isGbp ? gbp(minor, { sign }) : inr(minor);

  const wantsInr = isGbp && showInr && mode !== 'never';
  const visible = mode === 'always' ? true : revealed;

  const cls = `amt amt--${size} ${tone}`.trim();

  if (!wantsInr) {
    // INR accounts already show their own currency; GBP under "never" is bare.
    return (
      <span className={cls}>
        {primary}
        {!isGbp && currency === 'INR' && null}
      </span>
    );
  }

  const secondary = inr(toInr(minor, rate));

  if (mode === 'tap') {
    return (
      <span
        className={cls}
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setRevealed((v) => !v)}
      >
        <span className={revealed ? '' : 'amt-tap'}>{primary}</span>
        {visible &&
          (inline ? (
            <span className="amt-inr amt-inr--inline">{secondary}</span>
          ) : (
            <span className="amt-inr">{secondary}</span>
          ))}
      </span>
    );
  }

  return (
    <span className={cls}>
      {primary}
      {inline ? (
        <span className="amt-inr amt-inr--inline">{secondary}</span>
      ) : (
        <span className="amt-inr">{secondary}</span>
      )}
    </span>
  );
}

/* ======== components/Keypad.jsx ======== */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

// Value is held as a plain string of what's been typed: "3", "3.5", "3.50".
function toMinor(str) {
  if (!str) return 0;
  const n = parseFloat(str);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function Keypad({ value, onChange, caption }) {
  const { rate, settings } = useStore();

  const press = (k) => {
    if (k === 'del') return onChange(value.slice(0, -1));
    if (k === '.' && value.includes('.')) return;
    if (k === '.' && value === '') return onChange('0.');
    const dot = value.indexOf('.');
    if (dot > -1 && value.length - dot > 2) return; // two decimal places
    onChange(value + k);
  };

  const minor = toMinor(value);

  return (
    <div>
      <div className="pad__readout">
        <span className="pad__amount">{value === '' ? '£0.00' : gbp(minor)}</span>
        <span className="caption">
          {settings.inrDisplay === 'never' ? caption : `${inr(toInr(minor, rate))} · ${caption || ''}`}
        </span>
      </div>
      <div className="pad">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`pad__key${k === 'del' || k === '.' ? ' pad__key--util' : ''}`}
            onClick={() => press(k)}
            aria-label={k === 'del' ? 'Delete' : k}
          >
            {k === 'del' ? 'delete' : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ======== components/PreviewCard.jsx ======== */
// Editorial, one primary action. Always states the effect on safe-to-spend
// so a confirmation is never a leap of faith.
function PreviewCard({
  title,
  echo,
  lines = [],
  effect,
  confirmLabel = 'Confirm',
  onConfirm,
  onEdit,
  onDismiss,
  via,
}) {
  return (
    <div className="preview">
      <div className="preview__head">
        <div>
          <h2 className="preview__title">{title}</h2>
          {echo ? <p className="preview__quote">“{echo}”</p> : null}
        </div>
        <span className="label">{via === 'rules' ? 'Rules' : 'Draft'}</span>
      </div>

      <div style={{ marginTop: 4 }}>
        {lines.map((l) => (
          <Leader key={l.k} k={l.k} v={l.v} />
        ))}
      </div>

      {effect ? (
        <div className="preview__effect">
          <span>Safe to spend</span>
          <span>{effect}</span>
        </div>
      ) : null}

      <div className="preview__actions btnrow">
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        {onEdit ? (
          <Button variant="quiet" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onDismiss}>
          Discard
        </Button>
      </div>
    </div>
  );
}

/* ======== components/Toast.jsx ======== */
function Toast() {
  const { toast, setToast, restore } = useStore();

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="toast" role="status">
      <span>
        {toast.text}
        {toast.undo ? <span className="toast__timer"> · undo for 15 min</span> : null}
      </span>
      {toast.undo ? (
        <button
          className="toast__undo"
          onClick={() => {
            restore();
          }}
        >
          Undo
        </button>
      ) : (
        <button className="toast__undo" onClick={() => setToast(null)}>
          Close
        </button>
      )}
    </div>
  );
}

/* ======== components/TopBar.jsx ======== */
function TopBar({ title, stamp, back, navigate }) {
  const { today, settings } = useStore();
  return (
    <>
      {settings.offline ? (
        <div className="offline" role="status">
          <IconOffline />
          <span>Offline — commands will be parsed when you’re back</span>
        </div>
      ) : null}
      <header className="topbar">
        <div>
          {back ? (
            <button className="topbar__back" onClick={() => navigate(back.route)}>
              <IconBack size={14} />
              {back.label}
            </button>
          ) : null}
          <h1 className="topbar__title">{title}</h1>
        </div>
        <span className="topbar__stamp">{stamp || stampDate(today)}</span>
      </header>
    </>
  );
}

/* ======== components/TabBar.jsx ======== */
const TABS = [
  { route: '/dashboard', label: 'Board', Icon: IconBoard },
  { route: '/work', label: 'Work', Icon: IconWork },
  { route: '/', label: 'Command', cmd: true },
  { route: '/more', label: 'More', Icon: IconMore },
];

function TabBar({ route, navigate }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((t) => {
        const on = route === t.route;
        return (
          <button
            key={t.route}
            className={`tab${on ? ' tab--on' : ''}${t.cmd ? ' tab--cmd' : ''}`}
            onClick={() => navigate(t.route)}
            aria-current={on ? 'page' : undefined}
          >
            {t.cmd ? (
              <span className="keycap" aria-hidden="true">
                ›_
              </span>
            ) : (
              <t.Icon size={19} />
            )}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const RAIL = [
  { route: '/', label: 'Command' },
  { route: '/dashboard', label: 'Board' },
  { route: '/transactions', label: 'History' },
  { route: '/accounts', label: 'Accounts' },
  { route: '/budgets', label: 'Budgets' },
  { route: '/work', label: 'Work' },
  { route: '/commitments', label: 'Commitments' },
  { route: '/loans', label: 'Loan' },
  { route: '/settings', label: 'Settings' },
];

function Rail({ route, navigate }) {
  return (
    <aside className="rail">
      <div className="rail__brand">NottiPay</div>
      <nav aria-label="Sections">
        {RAIL.map((r) => (
          <button
            key={r.route}
            className={`rail__link${route === r.route ? ' rail__link--on' : ''}`}
            onClick={() => navigate(r.route)}
            aria-current={route === r.route ? 'page' : undefined}
          >
            {r.label}
          </button>
        ))}
      </nav>
      <p className="rail__hint">
        Press <span className="kbd">/</span> anywhere to jump to Command.
      </p>
    </aside>
  );
}

/* ======== pages/Command.jsx ======== */
function Command({ nav }) {
  const s = useStore();
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const [miss, setMiss] = useState(false);
  const [chip, setChip] = useState(s.quickChips[0]);
  const [pad, setPad] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (nav.focusCommand) ref.current?.focus();
  }, [nav.focusCommand]);

  const account = matchAccount(s.accounts, chip.accountId) || s.accounts.find((a) => a.id === chip.accountId);
  const padMinor = toMinor(pad);

  const submit = () => {
    if (!text.trim()) return;
    if (s.settings.offline) {
      s.say('Queued — will parse when you’re back', false);
      return;
    }
    const r = parseCommand(text);
    if (!r.ok) {
      setMiss(true);
      return;
    }
    setMiss(false);
    if (r.kind === 'question') {
      nav.setHighlight(r.draft.category);
      nav.navigate('/dashboard');
      setText('');
      return;
    }
    nav.setPreview({ kind: r.kind, draft: r.draft, echo: r.echo, via: r.via });
    nav.navigate(r.route);
    setText('');
  };

  const saveFromPad = () => {
    if (!padMinor) return;
    const draft = {
      amount: padMinor,
      merchant: chip.label,
      category: chip.categoryId,
      accountId: account?.id || chip.accountId,
      date: s.today,
      note: '',
    };
    if (padMinor >= s.settings.confirmThreshold) {
      nav.setPreview({ kind: 'expense', draft, echo: null, via: 'rules' });
      nav.navigate('/transactions');
    } else {
      s.addTransaction(draft);
    }
    setPad('');
  };

  const repeatLast = () => {
    const last = s.transactions[0];
    if (!last) return;
    s.addTransaction({
      amount: last.amount,
      merchant: last.merchant,
      category: last.category,
      accountId: last.accountId,
      date: s.today,
      note: last.note,
    });
  };

  return (
    <div className="page fade">
      <TopBar title="Command" navigate={nav.navigate} />

      <div className="cmd">
        <div className={`cmd__field${focus ? ' cmd__field--focus' : ''}`}>
          <span className="cmd__caret" aria-hidden="true">
            ›
          </span>
          <textarea
            ref={ref}
            className="cmd__input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (miss) setMiss(false);
            }}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            placeholder="3.50 lidl cash&#10;or  worked 5 hours today"
            aria-label="Type a command"
          />
        </div>

        <div className="cmd__meta">
          <span>
            {s.settings.offline
              ? 'Offline — held until you’re back'
              : s.settings.groqEnabled
              ? 'Rules first, model only if needed'
              : 'Rules only — model is off'}
          </span>
          <Button variant="quiet" onClick={submit} disabled={!text.trim()}>
            Read it
          </Button>
        </div>

        {miss ? (
          <div className="cmd__miss">
            Couldn’t read that one. Use the keypad below, or write it as{' '}
            <strong>amount, place, account</strong> — like <em>3.50 lidl cash</em>.
          </div>
        ) : null}
      </div>

      <div className="perf" />

      <Label>Quick add</Label>
      <div className="chips" style={{ marginTop: 10 }}>
        {s.quickChips.map((c) => (
          <Chip key={c.label} on={c.label === chip.label} onClick={() => setChip(c)}>
            {c.label}
            <span className="chip__amt">{gbp(c.last)}</span>
          </Chip>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Keypad value={pad} onChange={setPad} caption={`${chip.label} · ${account?.name}`} />
        <div className="btnrow" style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={saveFromPad} disabled={!padMinor}>
            {padMinor ? `Save ${gbp(padMinor)} · ${chip.label}` : 'Save'}
          </Button>
          <Button variant="quiet" onClick={repeatLast}>
            Repeat last
          </Button>
        </div>
        <p className="note" style={{ marginTop: 10 }}>
          Under {gbp(s.settings.confirmThreshold, { pence: false })} saves straight away. Anything
          larger shows a confirm first.
        </p>
      </div>

      <div className="perf" />

      <Section title="Recent" aside="tap to reuse">
        <div className="ledger">
          {s.recentCommands.map((c) => (
            <Row
              key={c.at}
              title={c.text}
              sub={clockStamp(c.at)}
              end={<span className="caption">{c.result}</span>}
              onClick={() => setText(c.text)}
            />
          ))}
        </div>
      </Section>

      <Section title="Phrases it knows">
        <div className="ledger">
          {EXAMPLES.map((e) => (
            <Row key={e} title={e} onClick={() => setText(e)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ======== pages/Dashboard.jsx ======== */
const BAND_COPY = {
  ok: 'Comfortable',
  tight: 'Tight',
  stop: 'Stop',
};

function Converter() {
  const { fx, rate } = useStore();
  const [gbpSide, setGbpSide] = useState(true);
  const [val, setVal] = useState('50');

  const n = parseFloat(val || '0') || 0;
  const out = gbpSide ? inr(toInr(Math.round(n * 100), rate)) : gbp(toGbp(Math.round(n * 100), rate));

  return (
    <Tile>
      <div className="spread">
        <Label>Converter</Label>
        <span className="caption">{fx.pair}</span>
      </div>
      <div className="conv" style={{ marginTop: 14 }}>
        <div className="conv__side">
          <span className="caption">{gbpSide ? 'Pounds' : 'Rupees'}</span>
          <input
            className="conv__val"
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ''))}
            aria-label={gbpSide ? 'Amount in pounds' : 'Amount in rupees'}
          />
        </div>
        <button
          className="conv__swap"
          onClick={() => setGbpSide((v) => !v)}
          aria-label="Swap direction"
        >
          <IconSwap size={17} />
        </button>
        <div className="conv__side">
          <span className="caption">{gbpSide ? 'Rupees' : 'Pounds'}</span>
          <div className="conv__val" style={{ borderBottomColor: 'transparent' }}>
            {out}
          </div>
        </div>
      </div>
      <p className="conv__stamp">
        1 GBP = {rate} INR · {clockStamp(fx.asOf)} · {fx.source}
      </p>
    </Tile>
  );
}

function Dashboard({ nav }) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const highlight = nav.highlight;

  useEffect(() => {
    if (!highlight) return undefined;
    const t = setTimeout(() => nav.setHighlight(null), 7000);
    return () => clearTimeout(t);
  }, [highlight, nav]);

  const maxCat = Math.max(...s.byCategory.map((c) => c.spent), 1);
  const nearest = s.upcoming.slice(0, 3);
  const monthName = MONTHS[Number(s.today.slice(5, 7)) - 1] || '';

  return (
    <div className="page fade">
      <TopBar title="Board" navigate={nav.navigate} />

      {highlight ? (
        <div className="tile tile--sunk" style={{ marginBottom: 16 }}>
          <Label accent>Answer</Label>
          <p style={{ margin: '8px 0 0', fontSize: 15 }}>
            {gbp(s.groceriesMonth)} on{' '}
            {s.categories.find((c) => c.id === highlight)?.name.toLowerCase() || highlight} so far
            this month, across {s.transactions.filter((t) => t.category === highlight).length}{' '}
            shops.
          </p>
        </div>
      ) : null}

      <div className="dash">
        <div>
          <div className="hero">
            <span className={`hero__band hero__band--${s.band}`}>
              <i />
              {BAND_COPY[s.band]}
            </span>
            <span className={`hero__figure hero__figure--${s.band}`}>{gbp(s.safe)}</span>
            <div className="hero__inr">
              {inr(s.safeInr)} · safe to spend to Sunday
            </div>

            <button className="hero__why" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <span>
                {gbp(s.spendable)} in hand, less {gbp(s.reserved)} already spoken for
              </span>
              <IconChevron
                size={16}
                style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 180ms' }}
              />
            </button>

            {open ? (
              <div className="fade" style={{ paddingTop: 8 }}>
                <Leader k="Cash and forex" v={gbp(s.spendable)} />
                <Leader k="Reserved for bills" v={`− ${gbp(s.reserved)}`} />
                <Leader k="Available" v={gbp(s.spendable - s.reserved)} />
                <Leader k="Essentials, paced" v={`− ${gbp(s.settings.pacedEssentials)}`} />
                <Leader k="Emergency floor" v={`− ${gbp(s.settings.emergencyFloor)}`} />
                <Leader k="Safe to spend" v={gbp(s.safe)} total />
                <p className="note" style={{ marginTop: 10 }}>
                  Indian accounts and the loan are left out on purpose.
                </p>
              </div>
            ) : null}

            <div className="daily">
              <span className="label">Per day, {s.daysLeftInWeek} days left</span>
              <Amount minor={s.dailySafe} size="lg" inline />
            </div>
          </div>

          <div className="stats" style={{ marginTop: 20 }}>
            <div className="stats__cell">
              <span className="label">Today</span>
              <div className="stats__v">{gbp(s.spentToday)}</div>
            </div>
            <div className="stats__cell">
              <span className="label">Week</span>
              <div className="stats__v">{gbp(s.spentWeek)}</div>
            </div>
            <div className="stats__cell">
              <span className="label">Month</span>
              <div className="stats__v">{gbp(s.spentMonth)}</div>
            </div>
          </div>
        </div>

        <div>
          <Section title="This month">
            <div className="stack">
              <Tile flag={highlight === 'groceries'}>
                <div className="spread">
                  <Label>Groceries</Label>
                  <span className="caption">
                    {gbp(s.groceriesMonth)} of {gbp(12000, { pence: false })}
                  </span>
                </div>
                <span className="tile__figure">{gbp(s.groceriesMonth)}</span>
                <div className="bar">
                  <div
                    className="bar__fill bar__fill--ok"
                    style={{ width: `${Math.min(100, (s.groceriesMonth / 12000) * 100)}%` }}
                  />
                </div>
                <p className="note" style={{ marginTop: 10 }}>
                  Biggest line so far this month.
                </p>
              </Tile>

              <Tile>
                <Label>Cash and card</Label>
                <div style={{ marginTop: 8 }}>
                  <Leader k="Cash" v={gbp(s.cashVsCard.cash)} />
                  <Leader k="Forex card" v={gbp(s.cashVsCard.card)} />
                </div>
              </Tile>
            </div>
          </Section>

          <Section title="Where it went" aside={monthName}>
            <div>
              {s.byCategory.map((c) => (
                <div className="cat" key={c.id}>
                  <span className="cat__name">{c.name}</span>
                  <span className="cat__track">
                    <span className="cat__fill" style={{ width: `${(c.spent / maxCat) * 100}%` }} />
                  </span>
                  <span className="cat__v">{gbp(c.spent)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Coming up" aside="next three">
            <div className="ledger">
              {nearest.map((c) => {
                const days = daysBetween(s.today, c.dueDate);
                const covered = c.amount <= s.spendable;
                return (
                  <Row
                    key={c.id}
                    title={c.name}
                    sub={`${shortDate(c.dueDate)} · ${days} days${covered ? '' : ' · not covered yet'}`}
                    end={<Amount minor={c.amount} />}
                    onClick={() => nav.navigate('/commitments')}
                  />
                );
              })}
            </div>
          </Section>

          <Section title="Rate">
            <Converter />
          </Section>

          <p className="caption" style={{ marginTop: 20 }}>
            Canara loan outstanding {inr(s.loanFigures.outstanding)} — borrowed money, kept out of
            everything above.{' '}
            <button className="btn btn--ghost" style={{ minHeight: 0, padding: 0, color: 'var(--accent)' }} onClick={() => nav.navigate('/loans')}>
              Open
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ======== pages/Work.jsx ======== */
function Work({ nav }) {
  const s = useStore();
  const [form, setForm] = useState(null);

  const preview = nav.preview?.kind === 'shift' ? nav.preview : null;
  const d = preview?.draft;
  const f = s.shiftFigures;

  const rate = s.employer?.rate || 1260;
  const draftPay = d ? Math.round((d.minutes * rate) / 60) : 0;

  const confirmShift = () => {
    s.addShift({ date: s.today, minutes: d.minutes, breakMinutes: 0, rate, employerId: 'emp1' });
    nav.setPreview(null);
  };

  return (
    <div className="page fade">
      <TopBar title="Work" navigate={nav.navigate} />

      {preview ? (
        <PreviewCard
          title={`${hoursLabel(d.minutes)} · ${d.when === 'today' ? 'today' : d.when}`}
          echo={preview.echo}
          lines={[
            { k: 'Employer', v: s.employer?.name || 'New — name it later' },
            { k: 'Rate', v: `${gbp(rate)}/hr` },
            { k: 'Expected pay', v: gbp(draftPay) },
            { k: 'Paid', v: 'Not yet' },
          ]}
          effect="No change until it's paid"
          confirmLabel="Save shift"
          onConfirm={confirmShift}
          onDismiss={() => nav.setPreview(null)}
        />
      ) : null}

      {!s.hasJob && !preview ? (
        <>
          <button className="gesture" onClick={() => setForm({ name: '', role: '', rate: '12.60' })}>
            <span className="label">Nothing here yet</span>
            <span className="gesture__title">I got a part-time job</span>
            <span className="gesture__sub">
              Add the employer once. After that a shift takes one line: worked 5 hours today.
            </span>
          </button>
          <p className="note" style={{ marginTop: 20, textAlign: 'center' }}>
            Wages only count as money once you mark them paid.
          </p>
        </>
      ) : null}

      {s.hasJob ? (
        <>
          <div className="stats" style={{ marginTop: 8 }}>
            <div className="stats__cell">
              <span className="label">This week</span>
              <div className="stats__v">{hoursLabel(f.weekMinutes)}</div>
            </div>
            <div className="stats__cell">
              <span className="label">Expected</span>
              <div className="stats__v">{gbp(f.expected)}</div>
            </div>
            <div className="stats__cell">
              <span className="label">Unpaid</span>
              <div className="stats__v">{gbp(f.expected - f.received)}</div>
            </div>
          </div>

          <Section title="Employer" aside={s.employer.payFrequency}>
            <div className="tile">
              <div className="spread">
                <div>
                  <div className="row__title">{s.employer.name}</div>
                  <div className="row__sub">
                    {s.employer.role} · {s.employer.location}
                  </div>
                </div>
                <Amount minor={s.employer.rate} showInr={false} />
              </div>
            </div>
          </Section>

          <Section title="Shifts" aside={`${hoursLabel(f.monthMinutes)} this month`}>
            <div className="ledger">
              {s.shifts.map((sh) => (
                <div className="row" key={sh.id}>
                  <span className="row__main">
                    <span className="row__title">{dayLabel(sh.date, s.today)}</span>
                    <span className="row__sub">
                      {hoursLabel(sh.minutes - sh.breakMinutes)}
                      {sh.breakMinutes ? ` · ${sh.breakMinutes}m break` : ''} ·{' '}
                      {sh.paid ? 'paid' : 'awaiting pay'}
                    </span>
                  </span>
                  <span className="row__end" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Amount minor={f.pay(sh)} tone={sh.paid ? 'amt--pos' : ''} />
                    <Switch
                      on={sh.paid}
                      onChange={() => s.toggleShiftPaid(sh.id)}
                      label={`Mark ${dayLabel(sh.date, s.today)} paid`}
                    />
                  </span>
                </div>
              ))}
            </div>
            {s.shifts.length === 0 ? (
              <p className="note" style={{ paddingTop: 12 }}>
                No shifts yet. Type <em>worked 5 hours today</em> in Command.
              </p>
            ) : null}
          </Section>

          <Section title="Pay">
            <Leader k="Expected, all shifts" v={gbp(f.expected)} />
            <Leader k="Received" v={gbp(f.received)} />
            <Leader k="Still owed" v={gbp(f.expected - f.received)} total />
            <p className="note" style={{ marginTop: 12 }}>
              Marking a shift paid adds it to your UK bank. Until then it stays out of safe-to-spend.
            </p>
          </Section>
        </>
      ) : null}

      {form ? (
        <Sheet title="New employer" onClose={() => setForm(null)}>
          <div className="field">
            <span className="label">Where</span>
            <input
              className="input"
              value={form.name}
              placeholder="Riverside Kitchen"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <span className="label">Role</span>
            <input
              className="input"
              value={form.role}
              placeholder="Front of house"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
          <div className="field">
            <span className="label">Hourly rate</span>
            <input
              className="input input--amt"
              inputMode="decimal"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
            />
          </div>
          <Button
            variant="primary"
            block
            lg
            onClick={() => {
              s.startJob({
                name: form.name || 'Riverside Kitchen',
                role: form.role || 'Front of house',
                rate: Math.round(parseFloat(form.rate || '12.60') * 100),
              });
              setForm(null);
            }}
          >
            Save employer
          </Button>
          <p className="note" style={{ marginTop: 14 }}>
            You can change the rate later — past shifts keep the rate they were worked at.
          </p>
        </Sheet>
      ) : null}
    </div>
  );
}

/* ======== pages/Transactions.jsx ======== */
function Transactions({ nav }) {
  const s = useStore();
  const [cat, setCat] = useState('all');
  const [acct, setAcct] = useState('all');
  const [period, setPeriod] = useState('month');
  const [editing, setEditing] = useState(null);
  const [draftEdit, setDraftEdit] = useState(null);

  const preview = nav.preview?.kind === 'expense' ? nav.preview : null;
  const d = preview?.draft;

  const list = useMemo(() => {
    return s.transactions.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (acct !== 'all' && t.accountId !== acct) return false;
      if (period === 'today' && t.date !== s.today) return false;
      if (period === 'week' && daysBetween(t.date, s.today) > 6) return false;
      return true;
    });
  }, [s.transactions, cat, acct, period, s.today]);

  const days = useMemo(() => {
    const map = new Map();
    list.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    });
    return [...map.entries()];
  }, [list]);

  const accountName = (id) =>
    (matchAccount(s.accounts, id) || s.accounts.find((a) => a.id === id))?.name || '—';
  const isCash = (id) =>
    (matchAccount(s.accounts, id) || s.accounts.find((a) => a.id === id))?.kind === 'cash';
  const catName = (id) => s.categories.find((c) => c.id === id)?.name || id;

  const openEdit = (t) => {
    setEditing(t);
    setDraftEdit({ ...t, amountText: (t.amount / 100).toFixed(2) });
  };

  const saveEdit = () => {
    const amount = Math.round(parseFloat(draftEdit.amountText || '0') * 100);
    s.updateTransaction(editing.id, {
      amount,
      merchant: draftEdit.merchant,
      category: draftEdit.category,
      accountId: draftEdit.accountId,
      note: draftEdit.note,
    });
    setEditing(null);
  };

  return (
    <div className="page page--flush fade">
      <div className="page__inner">
        <TopBar title="History" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

        {preview ? (
          <PreviewCard
            title={`${gbp(d.amount)} · ${d.merchant}`}
            echo={preview.echo}
            via={preview.via}
            lines={[
              { k: 'Category', v: catName(d.category) },
              { k: 'Account', v: accountName(d.accountId) },
              { k: 'Date', v: 'Today' },
              ...(d.note ? [{ k: 'Note', v: d.note }] : []),
            ]}
            effect={`${gbp(s.safe)} → ${gbp(s.safe - d.amount)}`}
            confirmLabel="Save it"
            onConfirm={() => {
              s.addTransaction({ ...d, date: s.today });
              nav.setPreview(null);
            }}
            onDismiss={() => nav.setPreview(null)}
          />
        ) : null}
      </div>

      <div className="filters">
        <Chip on={period === 'today'} onClick={() => setPeriod(period === 'today' ? 'month' : 'today')}>
          Today
        </Chip>
        <Chip on={period === 'week'} onClick={() => setPeriod(period === 'week' ? 'month' : 'week')}>
          This week
        </Chip>
        {s.categories.slice(0, 5).map((c) => (
          <Chip key={c.id} on={cat === c.id} onClick={() => setCat(cat === c.id ? 'all' : c.id)}>
            {c.name}
          </Chip>
        ))}
        {s.accounts
          .filter((a) => a.currency === 'GBP')
          .map((a) => (
            <Chip key={a.id} on={acct === a.id} onClick={() => setAcct(acct === a.id ? 'all' : a.id)}>
              {a.name}
            </Chip>
          ))}
      </div>

      <div className="page__inner">
        <div className="spread" style={{ margin: '12px 0 4px' }}>
          <Label>
            {list.length} entries · {gbp(list.reduce((n, t) => n + t.amount, 0))}
          </Label>
          <button
            className="btn btn--ghost"
            style={{ minHeight: 32 }}
            onClick={() => s.say('Exported 10 rows to CSV', false)}
          >
            <IconDownload size={16} /> CSV
          </button>
        </div>

        {days.length === 0 ? (
          <Empty title="Nothing here">
            Change the filters, or add something from Command.
          </Empty>
        ) : null}

        {days.map(([date, rows], i) => (
          <div className="daygroup" key={date}>
            <div className="daygroup__head">
              <Label>{dayLabel(date, s.today)}</Label>
              <span className="caption">
                {gbp(rows.filter((t) => t.type === 'expense').reduce((n, t) => n + t.amount, 0))}
              </span>
            </div>
            <div className="ledger">
              {i === 0 && preview ? (
                <Row
                  draft
                  title={d.merchant}
                  sub={`${catName(d.category)} · ${accountName(d.accountId)}`}
                  end={<Amount minor={d.amount} />}
                />
              ) : null}
              {rows.map((t) => (
                <Row
                  key={t.id}
                  title={t.merchant}
                  sub={t.type === 'income' ? 'Money in' : catName(t.category)}
                  marks={
                    <>
                      <span className="dot" />
                      <Mark cash={isCash(t.accountId)}>{isCash(t.accountId) ? 'cash' : 'card'}</Mark>
                    </>
                  }
                  end={<Amount minor={t.amount} sign={t.type === 'income'} />}
                  onClick={() => openEdit(t)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <Sheet title="Edit entry" onClose={() => setEditing(null)}>
          <div className="field">
            <span className="label">Amount</span>
            <input
              className="input input--amt"
              inputMode="decimal"
              value={draftEdit.amountText}
              onChange={(e) => setDraftEdit({ ...draftEdit, amountText: e.target.value })}
            />
          </div>
          <div className="field">
            <span className="label">Merchant</span>
            <input
              className="input"
              value={draftEdit.merchant}
              onChange={(e) => setDraftEdit({ ...draftEdit, merchant: e.target.value })}
            />
          </div>
          <div className="fieldgrid" style={{ marginTop: 16 }}>
            <div>
              <span className="label">Category</span>
              <select
                className="input"
                value={draftEdit.category}
                onChange={(e) => setDraftEdit({ ...draftEdit, category: e.target.value })}
              >
                {s.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Account</span>
              <select
                className="input"
                value={draftEdit.accountId}
                onChange={(e) => setDraftEdit({ ...draftEdit, accountId: e.target.value })}
              >
                {s.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">Note</span>
            <input
              className="input"
              value={draftEdit.note}
              onChange={(e) => setDraftEdit({ ...draftEdit, note: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="btnrow" style={{ marginTop: 20 }}>
            <Button variant="primary" onClick={saveEdit}>
              Save changes
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                s.reverseTransaction(editing.id);
                setEditing(null);
              }}
            >
              Reverse
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function AccountBalance({ account, live, currency, onSave }) {
  const [text, setText] = useState((account.balance / 100).toFixed(2));

  useEffect(() => {
    setText((account.balance / 100).toFixed(2));
  }, [account.balance]);

  if (!live) {
    return currency === 'INR' ? (
      <span className="amt amt--lg">{inr(account.balance)}</span>
    ) : (
      <Amount minor={account.balance} size="lg" />
    );
  }

  return (
    <input
      className="input input--amt"
      style={{ width: 108, textAlign: 'right' }}
      inputMode="decimal"
      value={text}
      aria-label={`${account.name} balance`}
      onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
      onBlur={() => onSave(Math.round((parseFloat(text) || 0) * 100))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

/* ======== pages/Accounts.jsx ======== */
function Accounts({ nav }) {
  const s = useStore();
  const here = s.accounts.filter((a) => a.currency === 'GBP');
  const home = s.accounts.filter((a) => a.currency === 'INR');

  return (
    <div className="page fade">
      <TopBar title="Accounts" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

      <Section title="In the UK" aside={gbp(s.spendable)}>
        <div className="ledger">
          {here.map((a) => (
            <div className="row" key={a.id}>
              <span className="row__main">
                <span className="row__title">{a.name}</span>
                <span className="row__sub">{a.note}</span>
              </span>
              <span className="row__end" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <AccountBalance
                  account={a}
                  live={s.live}
                  currency="GBP"
                  onSave={(balance) => s.setAccountBalance(a.id, balance)}
                />
                <Switch
                  on={a.includeInSafeSpend}
                  onChange={() => s.toggleInclude(a.id)}
                  label={`Include ${a.name} in safe to spend`}
                />
              </span>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          {s.live
            ? 'Balances start at zero. Type what you actually hold, then the hero updates.'
            : 'The switch decides what counts towards safe-to-spend. Turn the forex card off if you’re keeping it back for rent.'}
        </p>
      </Section>

      <Section title="At home" aside="not spendable here">
        <div className="ledger">
          {home.map((a) => (
            <div className="row" key={a.id}>
              <span className="row__main">
                <span className="row__title">{a.name}</span>
                <span className="row__sub">{a.note}</span>
              </span>
              <span className="row__end">
                <AccountBalance
                  account={a}
                  live={s.live}
                  currency="INR"
                  onSave={(balance) => s.setAccountBalance(a.id, balance)}
                />
                <span className="amt-inr">{gbp(Math.round(a.balance / s.rate))}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Position">
        <Leader k="Counted in safe to spend" v={gbp(s.spendable)} />
        <Leader k="Reserved for bills" v={`− ${gbp(s.reserved)}`} />
        <Leader
          k="Held at home"
          v={inr(home.reduce((n, a) => n + a.balance, 0))}
        />
        <Leader k="Safe to spend" v={gbp(s.safe)} total />
      </Section>
    </div>
  );
}

/* ======== pages/Budgets.jsx ======== */
function Line({ name, spent, limit }) {
  const pct = limit ? (spent / limit) * 100 : 0;
  const tone = pct > 100 ? 'stop' : pct > 80 ? 'tight' : 'ok';
  const left = limit - spent;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-hair)' }}>
      <div className="spread">
        <span style={{ fontSize: 14.5 }}>{name}</span>
        <span className="amt" style={{ fontSize: 13.5 }}>
          {gbp(spent)}{' '}
          <span style={{ color: 'var(--ink-4)' }}>/ {gbp(limit, { pence: false })}</span>
        </span>
      </div>
      <div className="bar">
        <div className={`bar__fill bar__fill--${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="caption" style={{ marginTop: 6 }}>
        {left >= 0 ? `${gbp(left)} left` : `${gbp(-left)} over`}
      </div>
    </div>
  );
}

function Budgets({ nav }) {
  const s = useStore();
  const spentFor = (id) => s.byCategory.find((c) => c.id === id)?.spent || 0;

  const rows = s.budgets.map((b) => {
    const cat = s.categories.find((c) => c.id === b.categoryId);
    return { ...b, name: cat.name, essential: cat.essential, spent: spentFor(b.categoryId) };
  });

  const essential = rows.filter((r) => r.essential);
  const flexible = rows.filter((r) => !r.essential);
  const sum = (xs, k) => xs.reduce((n, x) => n + x[k], 0);

  return (
    <div className="page fade">
      <TopBar title="Budgets" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

      <Section title="Essentials" aside={`${gbp(sum(essential, 'spent'))} of ${gbp(sum(essential, 'limit'), { pence: false })}`}>
        {essential.map((r) => (
          <Line key={r.categoryId} name={r.name} spent={r.spent} limit={r.limit} />
        ))}
      </Section>

      <Section title="The rest" aside={`${gbp(sum(flexible, 'spent'))} of ${gbp(sum(flexible, 'limit'), { pence: false })}`}>
        {flexible.map((r) => (
          <Line key={r.categoryId} name={r.name} spent={r.spent} limit={r.limit} />
        ))}
      </Section>

      <Section title={`${MONTHS[Number(s.today.slice(5, 7)) - 1] || ''} so far`}>
        <Leader k="Essentials" v={gbp(sum(essential, 'spent'))} />
        <Leader k="Everything else" v={gbp(sum(flexible, 'spent'))} />
        <Leader k="Spent" v={gbp(s.spentMonth)} total />
        <p className="note" style={{ marginTop: 12 }}>
          Setting-up costs are one-offs. They’ll drop off once the flat is sorted.
        </p>
      </Section>
    </div>
  );
}

/* ======== pages/Commitments.jsx ======== */
function Commitments({ nav }) {
  const s = useStore();
  const unpaid = s.commitments.filter((c) => c.status === 'unpaid');
  const paid = s.commitments.filter((c) => c.status === 'paid');

  return (
    <div className="page fade">
      <TopBar title="Commitments" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

      <div className="tile tile--sunk">
        <Label>Reserved before {shortDate(s.settings.nextPayday)}</Label>
        <span className="tile__figure">{gbp(s.reserved)}</span>
        <p className="note" style={{ marginTop: 10 }}>
          Held back from safe-to-spend. Anything due later is listed but not reserved yet.
        </p>
      </div>

      <Section title="Due" aside={`${unpaid.length} open`}>
        <div className="ledger">
          {unpaid.map((c) => {
            const days = daysBetween(s.today, c.dueDate);
            const covered = c.amount <= s.spendable;
            const reserved = s.reservedList.some((r) => r.id === c.id);
            return (
              <div className="row" key={c.id}>
                <span className="row__main">
                  <span className="row__title">{c.name}</span>
                  <span className="row__sub">
                    {shortDate(c.dueDate)} · in {days} days · {c.recurrence}
                    <span className="dot" />
                    <Mark>{reserved ? 'reserved' : covered ? 'covered' : 'not covered'}</Mark>
                  </span>
                </span>
                <span className="row__end" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Amount minor={c.amount} />
                  <Button variant="quiet" onClick={() => s.markCommitmentPaid(c.id)}>
                    Paid
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {paid.length ? (
        <Section title="Settled">
          <div className="ledger">
            {paid.map((c) => (
              <div className="row" key={c.id}>
                <span className="row__main">
                  <span className="row__title" style={{ color: 'var(--ink-3)' }}>
                    {c.name}
                  </span>
                  <span className="row__sub">Paid today</span>
                </span>
                <span className="row__end">
                  <Amount minor={c.amount} tone="amt--muted" />
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <p className="note" style={{ marginTop: 24 }}>
        Rent and tuition sit here rather than in a page of their own — they’re the same thing as a
        phone bill, only larger.
      </p>
    </div>
  );
}

/* ======== pages/Loans.jsx ======== */
function Loans({ nav }) {
  const s = useStore();
  const L = s.loan;
  const f = s.loanFigures;
  const preview = nav.preview?.kind === 'loan' ? nav.preview : null;
  const d = preview?.draft;

  const asGbp = (paise) => gbp(toGbp(paise, s.rate));

  return (
    <div className="page fade">
      <TopBar title="Loan" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

      {preview ? (
        <PreviewCard
          title={`${inr(d.amount)} disbursed`}
          echo={preview.echo}
          lines={[
            { k: 'Lender', v: L.lender },
            { k: 'Towards', v: d.purpose },
            { k: 'Rate used', v: `${s.rate} INR/GBP` },
            { k: 'In pounds', v: asGbp(d.amount) },
          ]}
          effect="Unchanged — borrowed money isn’t spendable cash"
          confirmLabel="Record it"
          onConfirm={() => {
            s.addDisbursement({ date: s.today, amount: d.amount, purpose: d.purpose });
            nav.setPreview(null);
          }}
          onDismiss={() => nav.setPreview(null)}
        />
      ) : null}

      <div className="tile tile--sunk">
        <div className="spread">
          <Label>{L.lender}</Label>
          <span className="caption">{L.ref}</span>
        </div>
        <span className="tile__figure">{inr(f.outstanding)}</span>
        <p className="caption" style={{ marginTop: 8 }}>
          {asGbp(f.outstanding)} · outstanding, estimated {shortDate(L.calcDate)}
        </p>
        <p className="note" style={{ marginTop: 12 }}>
          This is debt, not money you can spend. It never touches safe-to-spend.
        </p>
      </div>

      <Section title="Position">
        <Leader k="Sanctioned" v={inr(L.sanctioned)} />
        <Leader k="Taken so far" v={inr(f.taken)} />
        <Leader k="Interest accrued" v={inr(f.interest)} />
        <Leader k="Outstanding" v={inr(f.outstanding)} total />
        <Leader k="Left to draw" v={inr(f.remaining)} />
      </Section>

      <Section title="Terms">
        <Leader k="Rate" v={`${L.ratePct}% p.a.`} />
        <Leader k="Moratorium" v={L.moratorium} />
        <Leader k="Interest basis" v="Simple, to calc date" />
        <p className="note" style={{ marginTop: 12 }}>
          Interest is an estimate on this app’s own arithmetic — the bank’s statement is the real
          figure. Assumptions and calculation date are shown so you can check.
        </p>
      </Section>

      <Section title="Disbursements" aside={`${L.disbursements.length}`}>
        <div className="ledger">
          {L.disbursements.map((x) => (
            <Row
              key={x.id}
              title={x.purpose}
              sub={`${shortDate(x.date)} · at ${x.rateUsed} INR/GBP`}
              end={
                <>
                  <span className="amt amt--lg">{inr(x.amount)}</span>
                  <span className="amt-inr">{gbp(Math.round(x.amount / x.rateUsed))}</span>
                </>
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ======== pages/Settings.jsx ======== */
function Settings({ nav }) {
  const s = useStore();
  const set = s.setSetting;

  const money = (k) => (
    <input
      className="input input--amt"
      style={{ width: 96, textAlign: 'right' }}
      inputMode="decimal"
      value={(s.settings[k] / 100).toFixed(2)}
      onChange={(e) => set(k, Math.round((parseFloat(e.target.value) || 0) * 100))}
      aria-label={k}
    />
  );

  return (
    <div className="page fade">
      <TopBar title="Settings" navigate={nav.navigate} back={{ route: '/more', label: 'More' }} />

      <Section title="Appearance">
        <div className="ledger">
          <SettingRow
            title="Theme"
            note={THEMES.find((t) => t.id === s.settings.theme)?.hint}
            control={
              <Seg
                value={s.settings.theme}
                onChange={(v) => set('theme', v)}
                options={THEMES.map((t) => ({ value: t.id, label: t.name }))}
              />
            }
          />
          <SettingRow
            title="Rupees"
            note="How the second figure behaves"
            control={
              <Seg
                value={s.settings.inrDisplay}
                onChange={(v) => set('inrDisplay', v)}
                options={[
                  { value: 'always', label: 'Always' },
                  { value: 'tap', label: 'On tap' },
                  { value: 'never', label: 'Never' },
                ]}
              />
            }
          />
        </div>
      </Section>

      <Section title="Money rules">
        <div className="ledger">
          <SettingRow title="Confirm above" note="Smaller amounts save straight away" control={money('confirmThreshold')} />
          <SettingRow title="Emergency floor" note="Never counted as spendable" control={money('emergencyFloor')} />
          <SettingRow title="Essentials, paced" note="Pencilled in for the rest of the week" control={money('pacedEssentials')} />
          <SettingRow
            title="Next money in"
            note="Sets the reserving horizon"
            control={<span className="amt">{shortDate(s.settings.nextPayday)}</span>}
          />
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          Safe to spend right now: {gbp(s.safe)}. Change any figure above and it moves immediately.
        </p>
      </Section>

      <Section title="Parsing">
        <div className="ledger">
          <SettingRow
            title="Model fallback"
            note={s.settings.groqEnabled ? 'Groq, only when rules miss' : 'Rules only'}
            control={<Switch on={s.settings.groqEnabled} onChange={(v) => set('groqEnabled', v)} label="Model fallback" />}
          />
          <SettingRow
            title="Rate check"
            note={`${clockStamp(s.fx.asOf)} · ${s.fx.source} · next ${clockStamp(s.fx.nextCheck)}`}
            control={<span className="amt">{s.rate}</span>}
          />
        </div>
      </Section>

      {s.live ? null : (
        <Section title="Demo">
          <div className="ledger">
            <SettingRow
              title="Unlock the job"
              note="Fills Work with an employer and three shifts"
              control={<Switch on={s.settings.demoJob} onChange={(v) => set('demoJob', v)} label="Demo job" />}
            />
            <SettingRow
              title="Offline"
              note="Commands are held until you’re back"
              control={<Switch on={s.settings.offline} onChange={(v) => set('offline', v)} label="Offline" />}
            />
          </div>
        </Section>
      )}

      <Section title="Account">
        <div className="ledger">
          <SettingRow
            title={s.live ? 'Signed in' : 'Sign in'}
            note={s.live ? s.authEmail : 'One email, magic link'}
            control={
              s.live ? (
                <Button variant="quiet" onClick={s.signOut}>
                  Sign out
                </Button>
              ) : (
                <Button variant="quiet" onClick={() => nav.navigate('/login')}>
                  Sign in
                </Button>
              )
            }
          />
        </div>
      </Section>

      <Section title="Your data">
        <div className="stack">
          <Button variant="quiet" block onClick={() => s.say('Export ready — 10 rows', false)}>
            Export everything
          </Button>
          <p className="note">
            {s.live
              ? `${s.authEmail} · ${s.profile.tz}. Expenses you save now stay in Supabase.`
              : `${s.profile.email} · ${s.profile.course} · ${s.profile.tz}. Demo numbers only — sign in to keep a real ledger.`}
          </p>
        </div>
      </Section>
    </div>
  );
}

/* ======== pages/More.jsx ======== */
function More({ nav }) {
  const s = useStore();

  const items = [
    { route: '/transactions', label: 'History', end: `${s.transactions.length} entries` },
    { route: '/accounts', label: 'Accounts', end: gbp(s.spendable) },
    { route: '/budgets', label: 'Budgets', end: `${gbp(s.spentMonth)} spent` },
    { route: '/commitments', label: 'Commitments', end: `${gbp(s.reserved)} reserved` },
    { route: '/loans', label: 'Loan', end: inr(s.loanFigures.outstanding) },
    { route: '/settings', label: 'Settings', end: '' },
  ];

  return (
    <div className="page fade">
      <TopBar title="More" navigate={nav.navigate} />

      <div className="ledger">
        {items.map((i) => (
          <Row
            key={i.route}
            title={i.label}
            end={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
                <span className="amt" style={{ fontSize: 13.5 }}>
                  {i.end}
                </span>
                <IconChevron size={15} />
              </span>
            }
            onClick={() => nav.navigate(i.route)}
          />
        ))}
      </div>

      <Section title="Today">
        <p className="note">
          {s.profile.name} · {s.profile.city}. Landed 24 August. Spent {gbp(s.spentToday)} today,{' '}
          {gbp(s.spentWeek)} this week.
          {s.hasJob ? ` ${hoursLabel(s.shiftFigures.weekMinutes)} worked.` : ' No job logged yet.'}
        </p>
      </Section>
    </div>
  );
}

/* ======== pages/Login.jsx ======== */
function Login({ nav }) {
  const s = useStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError(
          res.status === 403
            ? 'This app is locked to one email.'
            : 'Could not send a link. Check the address and try again.'
        );
        return;
      }
      setSent(true);
    } catch {
      setError('Could not send a link. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (s.live) {
    return (
      <div className="page fade" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ paddingTop: 88 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            NottiPay
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              margin: '14px 0 0',
            }}
          >
            Signed in.
          </h1>
          <p className="note" style={{ marginTop: 12, maxWidth: '32ch' }}>
            {s.authEmail}. This device keeps the session.
          </p>
        </div>
        <div style={{ marginTop: 32 }}>
          <Button variant="quiet" block onClick={s.signOut}>
            Sign out
          </Button>
        </div>
        <div style={{ marginTop: 'auto', paddingBottom: 40 }}>
          <Button variant="primary" block onClick={() => nav.navigate('/dashboard')}>
            Back to the board
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ paddingTop: 88 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          NottiPay
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            margin: '14px 0 0',
          }}
        >
          {sent ? 'Check your email.' : 'One email. One account.'}
        </h1>
        <p className="note" style={{ marginTop: 12, maxWidth: '32ch' }}>
          {sent
            ? `A link is on its way to ${email}. It works once.`
            : 'No password. A link arrives in your inbox and signs you in on this device.'}
        </p>
      </div>

      {!sent ? (
        <div style={{ marginTop: 32 }}>
          <span className="label">Email</span>
          <input
            className="input"
            style={{ marginTop: 6 }}
            type="email"
            value={email}
            placeholder="you@email.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
          />
          {error ? (
            <p className="note" style={{ marginTop: 10, color: 'var(--band-stop)' }}>
              {error}
            </p>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" block lg onClick={send}>
              {busy ? 'Sending…' : 'Send the link'}
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 'auto', paddingBottom: 40 }}>
        <Button variant="quiet" block onClick={() => nav.navigate('/dashboard')}>
          Back to the board
        </Button>
      </div>
    </div>
  );
}

/* ======== App.jsx ======== */
const PAGES = {
  '/': Command,
  '/dashboard': Dashboard,
  '/work': Work,
  '/transactions': Transactions,
  '/accounts': Accounts,
  '/budgets': Budgets,
  '/commitments': Commitments,
  '/loans': Loans,
  '/settings': Settings,
  '/more': More,
  '/login': Login,
};

function Shell() {
  const s = useStore();
  const [route, setRoute] = useState('/dashboard');
  const [preview, setPreview] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [focusCommand, setFocusCommand] = useState(0);

  const navigate = useCallback((r) => {
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  // "/" jumps to Command from anywhere, the way a till operator would expect.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') {
        e.preventDefault();
        setRoute('/');
        setFocusCommand((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signedin')) {
      s.say('Signed in', false);
      window.history.replaceState({}, '', '/');
    }
    if (params.get('auth') === 'error') {
      s.say('Sign-in link failed — request a new one', false);
      window.history.replaceState({}, '', '/');
      setRoute('/login');
    }
    // Read the landing query once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Page = PAGES[route] || Dashboard;
  const nav = { route, navigate, preview, setPreview, highlight, setHighlight, focusCommand };

  if (!s.ready) {
    return (
      <div className="app">
        <div className="page" style={{ paddingTop: 88 }}>
          <p className="note">Opening the book…</p>
        </div>
      </div>
    );
  }

  if (route === '/login') {
    return (
      <div className="app">
        <Login nav={nav} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="shell">
        <Rail route={route} navigate={navigate} />
        <Page key={route} nav={nav} />
      </div>
      <TabBar route={route} navigate={navigate} />
      <Toast />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </StoreProvider>
  );
}

export default App;


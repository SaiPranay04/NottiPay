import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import * as mock from './mockData';
import { daysBetween, toInr } from './format';

// localStorage is wrapped: some preview sandboxes block it, and a
// money app should never fall over because storage is unavailable.
const memory = {};
export const store = {
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
export const useStore = () => useContext(Ctx);

let seq = 100;
const nextId = (p) => `${p}${++seq}`;

export function StoreProvider({ children }) {
  const [accounts, setAccounts] = useState(mock.accounts);
  const [transactions, setTransactions] = useState(mock.transactions);
  const [commitments, setCommitments] = useState(mock.commitments);
  const [loan, setLoan] = useState(mock.loan);
  const [settings, setSettings] = useState({
    ...mock.settings,
    theme: store.get('vf.theme', mock.settings.theme),
  });
  const [employer, setEmployer] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [toast, setToast] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const rate = mock.fx.rate;

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
          daysBetween(mock.TODAY, c.dueDate) <= daysBetween(mock.TODAY, settings.nextPayday)
      ),
    [commitments, settings.nextPayday]
  );

  const reserved = useMemo(() => reservedList.reduce((n, c) => n + c.amount, 0), [reservedList]);

  const safe = spendable - reserved - settings.pacedEssentials - settings.emergencyFloor;

  const daysLeftInWeek = Math.max(1, daysBetween(mock.TODAY, settings.weekEndsOn) + 1);
  const dailySafe = Math.round(safe / daysLeftInWeek);

  const band = dailySafe >= 2500 ? 'ok' : dailySafe >= 1200 ? 'tight' : 'stop';

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);

  const spentToday = useMemo(
    () => expenses.filter((t) => t.date === mock.TODAY).reduce((n, t) => n + t.amount, 0),
    [expenses]
  );
  const spentWeek = useMemo(
    () =>
      expenses
        .filter((t) => daysBetween(t.date, mock.TODAY) <= 6 && daysBetween(t.date, mock.TODAY) >= 0)
        .reduce((n, t) => n + t.amount, 0),
    [expenses]
  );
  const spentMonth = useMemo(
    () => expenses.filter((t) => t.date.startsWith('2026-08')).reduce((n, t) => n + t.amount, 0),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const map = {};
    expenses
      .filter((t) => t.date.startsWith('2026-08'))
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return mock.categories
      .map((c) => ({ ...c, spent: map[c.id] || 0 }))
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [expenses]);

  const cashVsCard = useMemo(() => {
    let cash = 0;
    let card = 0;
    expenses
      .filter((t) => t.date.startsWith('2026-08'))
      .forEach((t) => {
        const acc = accounts.find((a) => a.id === t.accountId);
        if (acc && acc.kind === 'cash') cash += t.amount;
        else card += t.amount;
      });
    return { cash, card };
  }, [expenses, accounts]);

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
    const taken = loan.disbursements.reduce((n, x) => n + x.amount, 0);
    // Simple interest accrued during the moratorium, to the calc date.
    const interest = loan.disbursements.reduce((n, x) => {
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
    const week = shifts.filter((s) => daysBetween(s.date, mock.TODAY) <= 6);
    return {
      pay,
      paidMin,
      weekMinutes: week.reduce((n, s) => n + paidMin(s), 0),
      monthMinutes: shifts.reduce((n, s) => n + paidMin(s), 0),
      expected: shifts.reduce((n, s) => n + pay(s), 0),
      received: shifts.filter((s) => s.paid).reduce((n, s) => n + pay(s), 0),
    };
  }, [shifts]);

  // ---- mutations ---------------------------------------------------

  const capture = useCallback(
    () => setSnapshot({ accounts, transactions, commitments, loan, shifts, employer }),
    [accounts, transactions, commitments, loan, shifts, employer]
  );

  const restore = useCallback(() => {
    if (!snapshot) return;
    setAccounts(snapshot.accounts);
    setTransactions(snapshot.transactions);
    setCommitments(snapshot.commitments);
    setLoan(snapshot.loan);
    setShifts(snapshot.shifts);
    setEmployer(snapshot.employer);
    setSnapshot(null);
    setToast({ id: nextId('k'), text: 'Reverted', undo: false });
  }, [snapshot]);

  const say = (text, undo = true) => setToast({ id: nextId('k'), text, undo });

  const addTransaction = (t) => {
    capture();
    const tx = { id: nextId('t'), type: 'expense', note: '', ...t };
    setTransactions((xs) => [tx, ...xs]);
    setAccounts((xs) =>
      xs.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a))
    );
    say(`Saved — ${tx.merchant}`);
    return tx;
  };

  const reverseTransaction = (id) => {
    capture();
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    setTransactions((xs) => xs.filter((t) => t.id !== id));
    setAccounts((xs) =>
      xs.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + tx.amount } : a))
    );
    say(`Reversed — ${tx.merchant}`);
  };

  const updateTransaction = (id, patch) => {
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
      setAccounts((xs) =>
        xs.map((a) =>
          a.id === 'acc_uk_bank'
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
      setAccounts((xs) =>
        xs.map((a) => (a.id === 'acc_forex' ? { ...a, balance: a.balance - c.amount } : a))
      );
      setTransactions((xs) => [
        {
          id: nextId('t'),
          date: mock.TODAY,
          merchant: c.name,
          category: c.kind === 'fees' ? 'university' : c.kind,
          accountId: 'acc_forex',
          amount: c.amount,
          type: 'expense',
          note: 'Commitment',
        },
        ...xs,
      ]);
    }
    say('Marked paid');
  };

  const toggleInclude = (id) => {
    setAccounts((xs) =>
      xs.map((a) => (a.id === id ? { ...a, includeInSafeSpend: !a.includeInSafeSpend } : a))
    );
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
    categories: mock.categories,
    budgets: mock.budgets,
    quickChips: mock.quickChips,
    recentCommands: mock.recentCommands,
    profile: mock.profile,
    fx: mock.fx,
    rate,
    today: mock.TODAY,
    now: mock.NOW,
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
    setSetting,
    toast,
    setToast,
    restore,
    say,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

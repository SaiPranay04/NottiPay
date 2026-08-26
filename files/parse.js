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

export function parseCommand(text) {
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

export const EXAMPLES = [
  'paid 3.5 pound cash at lidl for butter and curd',
  'paid 2.3 pounds card for transport',
  'worked 5 hours today',
  'Canara disbursed 450000 rupees toward tuition',
  'how much on groceries this month',
  '3.50 lidl cash',
];

import React, { useState, useMemo } from 'react';
import TopBar from '../components/TopBar';
import Amount from '../components/Amount';
import PreviewCard from '../components/PreviewCard';
import { Label, Row, Chip, Button, Sheet, Mark, Empty } from '../components/Primitives';
import { IconDownload } from '../components/Icons';
import { gbp, dayLabel, daysBetween } from '../format';
import { useStore } from '../store';

export default function Transactions({ nav }) {
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

  const accountName = (id) => s.accounts.find((a) => a.id === id)?.name || '—';
  const isCash = (id) => s.accounts.find((a) => a.id === id)?.kind === 'cash';
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
              <span className="caption">{gbp(rows.reduce((n, t) => n + t.amount, 0))}</span>
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
                  sub={catName(t.category)}
                  marks={
                    <>
                      <span className="dot" />
                      <Mark cash={isCash(t.accountId)}>{isCash(t.accountId) ? 'cash' : 'card'}</Mark>
                    </>
                  }
                  end={<Amount minor={t.amount} />}
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

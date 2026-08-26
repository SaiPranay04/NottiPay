import React, { useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import Amount from '../components/Amount';
import { Label, Section, Tile, Leader, Row, Button } from '../components/Primitives';
import { IconSwap, IconChevron } from '../components/Icons';
import { gbp, inr, toInr, toGbp, shortDate, daysBetween, clockStamp } from '../format';
import { useStore } from '../store';

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

export default function Dashboard({ nav }) {
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
                  Biggest line so far. Four shops since you landed.
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

          <Section title="Where it went" aside="August">
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

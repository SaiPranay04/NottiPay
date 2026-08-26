import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import Amount from '../components/Amount';
import PreviewCard from '../components/PreviewCard';
import { Label, Section, Row, Button, Sheet, Leader, Switch } from '../components/Primitives';
import { gbp, hoursLabel, dayLabel } from '../format';
import { useStore } from '../store';

export default function Work({ nav }) {
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

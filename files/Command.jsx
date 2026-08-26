import React, { useState, useRef, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { Label, Section, Button, Chip, Row } from '../components/Primitives';
import Keypad, { toMinor } from '../components/Keypad';
import { parseCommand, EXAMPLES } from '../parse';
import { gbp, clockStamp } from '../format';
import { useStore } from '../store';

export default function Command({ nav }) {
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

  const account = s.accounts.find((a) => a.id === chip.accountId);
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
      accountId: chip.accountId,
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

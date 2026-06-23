'use client';

import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// LIVE WORKFLOW DASHBOARD — Lead Intake Pipeline
// ----------------------------------------------------------------------------
// Drop this into a Next.js app at /pages/index.jsx (or app/page.jsx).
// In your real deploy, replace MOCK_MODE with Pusher subscription (see bottom).
// ============================================================================

const MOCK_MODE = false;

// -- Mock event stream for local preview ------------------------------------
const MOCK_LEAD = {
  id: 'lead_' + Math.random().toString(36).slice(2, 8),
  source: 'qr-flyer',
  channel: 'sms',
  phone: '+1 (312) 555-0142',
};

const MOCK_SEQUENCE = [
  { t: 0,    type: 'lead_received',     payload: { source: 'qr-flyer', channel: 'sms', phone: '+1 (312) 555-0142', campaign: 'fall-enrollment-2026' } },
  { t: 900,  type: 'transcription_done', payload: { text: 'Hi I saw the flyer at the cafe — interested in the spring cohort for the data analytics program. My name is Jordan Reyes.' } },
  { t: 2200, type: 'fields_extracted',  payload: { name: 'Jordan Reyes', interest: 'Data Analytics', cohort: 'Spring', email: null } },
  { t: 3400, type: 'scored',            payload: { score: 87, tier: 'HOT', reasoning: 'Named program, specified cohort, scanned physical flyer (high intent signal)' } },
  { t: 4600, type: 'record_created',    payload: { airtable_id: 'recXk93jJqL2', url: 'https://airtable.com/...' } },
];

// ---------------------------------------------------------------------------

const STAGES = [
  { key: 'lead_received',     label: 'Intake',         num: '01' },
  { key: 'transcription_done', label: 'Transcribe',    num: '02' },
  { key: 'fields_extracted',  label: 'Extract',        num: '03' },
  { key: 'scored',            label: 'Score',          num: '04' },
  { key: 'record_created',    label: 'Persist',        num: '05' },
];

const SOURCE_META = {
  'qr-flyer': { label: 'QR FLYER',  glyph: '▦' },
  'ppc':      { label: 'PPC AD',    glyph: '◈' },
  'webform':  { label: 'WEB FORM',  glyph: '◫' },
  'phone':    { label: 'INBOUND',   glyph: '◉' },
};

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [currentLead, setCurrentLead] = useState(null);
  const [stageStatus, setStageStatus] = useState({});
  const [stats, setStats] = useState({ total: 0, hot: 0, cold: 0 });
  const [now, setNow] = useState(null);
  const feedRef = useRef(null);

  // Clock for the header — initialized client-side only to avoid hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll event feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  // Event handler — called by either mock or Pusher
  const handleEvent = (evt) => {
    const stamped = { ...evt, ts: new Date() };
    setEvents((e) => [...e, stamped]);
    setStageStatus((s) => ({ ...s, [evt.type]: 'done' }));

    if (evt.type === 'lead_received') {
      setCurrentLead({ ...evt.payload, id: 'lead_' + Math.random().toString(36).slice(2, 8) });
      setStageStatus({ lead_received: 'done' });
    }
    if (evt.type === 'scored') {
      setStats((s) => ({
        total: s.total + 1,
        hot: s.hot + (evt.payload.tier === 'HOT' ? 1 : 0),
        cold: s.cold + (evt.payload.tier !== 'HOT' ? 1 : 0),
      }));
      setCurrentLead((l) => l && { ...l, score: evt.payload.score, tier: evt.payload.tier, reasoning: evt.payload.reasoning });
    }
    if (evt.type === 'fields_extracted') {
      setCurrentLead((l) => l && { ...l, ...evt.payload });
    }
    if (evt.type === 'record_created') {
      setCurrentLead((l) => l && { ...l, airtable_id: evt.payload.airtable_id });
    }
  };

  // -- MOCK trigger (for local preview) -----------------------------------
  const triggerMock = (source) => {
    setEvents([]);
    setStageStatus({});
    const seq = MOCK_SEQUENCE.map((e) =>
      e.type === 'lead_received'
        ? { ...e, payload: { ...e.payload, source } }
        : e
    );
    seq.forEach((e) => {
      setTimeout(() => handleEvent(e), e.t);
    });
  };

  // -- PUSHER subscription (production) -----------------------------------
  useEffect(() => {
    if (MOCK_MODE) return;
    import('pusher-js').then(({ default: Pusher }) => {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      });
      const channel = pusher.subscribe('lead-pipeline');
      STAGES.forEach((s) => channel.bind(s.key, (data) => handleEvent({ type: s.key, payload: data })));
      return () => pusher.disconnect();
    });
  }, []);

  return (
    <div style={S.shell}>
      <style>{CSS}</style>

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header style={S.header}>
        <div style={S.brand}>
          <div style={S.brandMark}>◐</div>
          <div>
            <div style={S.brandName}>NORTHFEED / OPS</div>
            <div style={S.brandSub}>lead intake pipeline — real-time</div>
          </div>
        </div>
        <div style={S.headerRight}>
          <Stat label="TOTAL" value={stats.total} />
          <Stat label="HOT" value={stats.hot} tone="hot" />
          <Stat label="COLD" value={stats.cold} tone="cold" />
          <div style={S.clock}>
            {now ? now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '--- -- --:--:-- UTC'}
            <div style={S.pulse}><span style={S.pulseDot} />LIVE</div>
          </div>
        </div>
      </header>

      {/* ─── Trigger row ─────────────────────────────────────────── */}
      <section style={S.triggerRow}>
        <div style={S.triggerLabel}>
          <span style={S.kicker}>// SIMULATE</span>
          <span style={S.triggerHelp}>fire a test event through the production pipeline</span>
        </div>
        <div style={S.triggerBtns}>
          {Object.entries(SOURCE_META).map(([k, v]) => (
            <button key={k} style={S.triggerBtn} onClick={() => triggerMock(k)}>
              <span style={S.btnGlyph}>{v.glyph}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Pipeline visualization ─────────────────────────────── */}
      <section style={S.pipeline}>
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <StageBlock stage={stage} status={stageStatus[stage.key]} />
            {i < STAGES.length - 1 && (
              <div style={{ ...S.connector, ...(stageStatus[STAGES[i + 1].key] ? S.connectorActive : {}) }} />
            )}
          </React.Fragment>
        ))}
      </section>

      {/* ─── Main grid: feed + record ───────────────────────────── */}
      <section style={S.grid}>
        <div style={S.panel}>
          <div style={S.panelHead}>
            <span style={S.kicker}>// EVENT FEED</span>
            <span style={S.panelCount}>{events.length} events</span>
          </div>
          <div ref={feedRef} style={S.feed}>
            {events.length === 0 && (
              <div style={S.feedEmpty}>
                <div style={S.feedEmptyGlyph}>⌁</div>
                <div>waiting for inbound event…</div>
                <div style={S.feedEmptyHint}>text or call your Twilio number, or fire a simulation above</div>
              </div>
            )}
            {events.map((e, i) => (
              <EventLine key={i} event={e} />
            ))}
          </div>
        </div>

        <div style={S.panel}>
          <div style={S.panelHead}>
            <span style={S.kicker}>// CURRENT RECORD</span>
            {currentLead?.tier && <TierBadge tier={currentLead.tier} />}
          </div>
          <div style={S.record}>
            {!currentLead && (
              <div style={S.feedEmpty}>
                <div style={S.feedEmptyGlyph}>◌</div>
                <div>no active lead</div>
              </div>
            )}
            {currentLead && <RecordCard lead={currentLead} />}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer style={S.footer}>
        <span>twilio → n8n → llm-score → airtable</span>
        <span>pusher channel: lead-pipeline</span>
      </footer>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Stat({ label, value, tone }) {
  return (
    <div style={S.stat}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statVal, ...(tone === 'hot' ? { color: '#ff5b3a' } : tone === 'cold' ? { color: '#6da4ff' } : {}) }}>
        {String(value).padStart(3, '0')}
      </div>
    </div>
  );
}

function StageBlock({ stage, status }) {
  const active = status === 'done';
  return (
    <div style={{ ...S.stage, ...(active ? S.stageActive : {}) }}>
      <div style={S.stageNum}>{stage.num}</div>
      <div style={S.stageLabel}>{stage.label}</div>
      <div style={{ ...S.stageDot, ...(active ? S.stageDotActive : {}) }} />
    </div>
  );
}

function TierBadge({ tier }) {
  const hot = tier === 'HOT';
  return (
    <span style={{ ...S.tier, ...(hot ? S.tierHot : S.tierCold) }}>
      {hot ? '●' : '○'} {tier}
    </span>
  );
}

function EventLine({ event }) {
  const time = event.ts.toISOString().slice(11, 23);
  return (
    <div style={S.evt}>
      <span style={S.evtTime}>{time}</span>
      <span style={S.evtType}>{event.type}</span>
      <span style={S.evtPayload}>{formatPayload(event.payload)}</span>
    </div>
  );
}

function formatPayload(p) {
  if (!p) return '';
  return Object.entries(p)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'string' && v.length > 40 ? v.slice(0, 40) + '…' : v}`)
    .join('  ');
}

function RecordCard({ lead }) {
  const fields = [
    ['Lead ID', lead.id],
    ['Source', SOURCE_META[lead.source]?.label || lead.source],
    ['Channel', lead.channel],
    ['Phone', lead.phone],
    ['Name', lead.name],
    ['Interest', lead.interest],
    ['Cohort', lead.cohort],
    ['Airtable', lead.airtable_id],
  ].filter(([, v]) => v);

  return (
    <div>
      <div style={S.recScore}>
        {lead.score !== undefined && (
          <>
            <div style={S.recScoreNum}>{lead.score}</div>
            <div style={S.recScoreLabel}>LEAD SCORE / 100</div>
          </>
        )}
      </div>
      <div style={S.recFields}>
        {fields.map(([k, v]) => (
          <div key={k} style={S.recRow}>
            <span style={S.recKey}>{k}</span>
            <span style={S.recVal}>{v}</span>
          </div>
        ))}
      </div>
      {lead.reasoning && (
        <div style={S.recReason}>
          <div style={S.kicker}>// MODEL REASONING</div>
          <div style={S.recReasonText}>{lead.reasoning}</div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&display=swap');

  * { box-sizing: border-box; }
  body { margin: 0; background: #0a0b0d; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes flow {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
  }
`;

const C = {
  bg: '#0a0b0d',
  surface: '#111316',
  surface2: '#16191d',
  line: '#1f2329',
  line2: '#2a2f37',
  text: '#e8e6e1',
  dim: '#7a7e87',
  dimmer: '#4a4e57',
  accent: '#d4ff3a',     // signal yellow-green
  hot: '#ff5b3a',
  cold: '#6da4ff',
};

const S = {
  shell: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    padding: '20px 24px',
    backgroundImage: `
      radial-gradient(circle at 20% 0%, rgba(212, 255, 58, 0.04) 0%, transparent 40%),
      radial-gradient(circle at 80% 100%, rgba(109, 164, 255, 0.03) 0%, transparent 40%)
    `,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottom: `1px solid ${C.line}`,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  brandMark: { fontSize: 32, color: C.accent, lineHeight: 1 },
  brandName: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' },
  brandSub: { fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 },
  headerRight: { display: 'flex', gap: 32, alignItems: 'center' },
  stat: { textAlign: 'right' },
  statLabel: { fontSize: 10, color: C.dim, letterSpacing: '0.15em' },
  statVal: { fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, lineHeight: 1, marginTop: 2 },
  clock: { fontSize: 11, color: C.dim, textAlign: 'right' },
  pulse: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4, fontSize: 10, color: C.accent, letterSpacing: '0.15em' },
  pulseDot: { width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'pulse 1.5s infinite' },

  triggerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0',
    gap: 24,
  },
  triggerLabel: { display: 'flex', flexDirection: 'column', gap: 4 },
  kicker: { fontSize: 10, color: C.accent, letterSpacing: '0.2em', fontWeight: 500 },
  triggerHelp: { fontSize: 12, color: C.dim },
  triggerBtns: { display: 'flex', gap: 8 },
  triggerBtn: {
    background: C.surface,
    border: `1px solid ${C.line2}`,
    color: C.text,
    padding: '10px 16px',
    fontFamily: 'inherit',
    fontSize: 11,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s',
  },
  btnGlyph: { color: C.accent, fontSize: 14 },

  pipeline: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '20px 24px',
    background: C.surface,
    border: `1px solid ${C.line}`,
    marginBottom: 16,
  },
  stage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '12px 8px',
    opacity: 0.4,
    transition: 'opacity 0.3s',
  },
  stageActive: { opacity: 1 },
  stageNum: { fontFamily: "'Fraunces', serif", fontSize: 11, color: C.dim, letterSpacing: '0.1em' },
  stageLabel: { fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' },
  stageDot: { width: 8, height: 8, borderRadius: '50%', background: C.line2, marginTop: 4 },
  stageDotActive: { background: C.accent, boxShadow: `0 0 12px ${C.accent}` },
  connector: {
    flex: 0.5,
    height: 1,
    background: C.line2,
    position: 'relative',
  },
  connectorActive: {
    background: `linear-gradient(90deg, ${C.accent}, ${C.accent}80, ${C.accent})`,
    backgroundSize: '200% 100%',
    animation: 'flow 2s linear infinite',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 16,
    marginBottom: 16,
  },
  panel: {
    background: C.surface,
    border: `1px solid ${C.line}`,
    minHeight: 420,
    display: 'flex',
    flexDirection: 'column',
  },
  panelHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: `1px solid ${C.line}`,
  },
  panelCount: { fontSize: 11, color: C.dim },
  feed: {
    flex: 1,
    padding: '12px 0',
    overflowY: 'auto',
    maxHeight: 420,
  },
  feedEmpty: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: C.dim,
    gap: 8,
    padding: 40,
    textAlign: 'center',
  },
  feedEmptyGlyph: { fontSize: 32, color: C.dimmer, marginBottom: 8 },
  feedEmptyHint: { fontSize: 11, color: C.dimmer, maxWidth: 280, lineHeight: 1.5 },
  evt: {
    display: 'grid',
    gridTemplateColumns: '110px 160px 1fr',
    gap: 12,
    padding: '6px 18px',
    fontSize: 11,
    animation: 'slideIn 0.25s ease-out',
    borderLeft: `2px solid transparent`,
  },
  evtTime: { color: C.dim },
  evtType: { color: C.accent, letterSpacing: '0.05em' },
  evtPayload: { color: C.text, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  record: { padding: 20, flex: 1, overflowY: 'auto' },
  recScore: { textAlign: 'center', padding: '12px 0 24px', borderBottom: `1px dashed ${C.line2}`, marginBottom: 18 },
  recScoreNum: { fontFamily: "'Fraunces', serif", fontSize: 72, fontWeight: 600, color: C.text, lineHeight: 1 },
  recScoreLabel: { fontSize: 10, color: C.dim, letterSpacing: '0.2em', marginTop: 4 },
  recFields: { display: 'flex', flexDirection: 'column', gap: 8 },
  recRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' },
  recKey: { color: C.dim, letterSpacing: '0.05em' },
  recVal: { color: C.text, fontWeight: 500 },
  recReason: { marginTop: 20, padding: 14, background: C.bg, border: `1px solid ${C.line}` },
  recReasonText: { fontSize: 12, color: C.text, opacity: 0.85, lineHeight: 1.6, marginTop: 8, fontFamily: "'Fraunces', serif", fontStyle: 'italic' },

  tier: {
    fontSize: 11,
    letterSpacing: '0.15em',
    padding: '4px 10px',
    border: `1px solid currentColor`,
  },
  tierHot: { color: C.hot },
  tierCold: { color: C.cold },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: C.dimmer,
    letterSpacing: '0.1em',
    paddingTop: 16,
    borderTop: `1px solid ${C.line}`,
  },
};

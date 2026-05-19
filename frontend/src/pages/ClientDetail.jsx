import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AgentTimeline from '../components/AgentTimeline.jsx';
import AnimatedCounter from '../components/AnimatedCounter.jsx';
import ChannelCharts from '../components/ChannelCharts.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import MetricsTable from '../components/MetricsTable.jsx';
import ReportPreview from '../components/ReportPreview.jsx';
import { fetchClient, streamReportGeneration } from '../lib/api.js';

const DEFAULT_AGENTS = [
  { step: 1, key: 'data_analyzer', name: 'Data Analyzer', description: 'Crunches raw metrics, computes ROI, flags anomalies.' },
  { step: 2, key: 'insight_agent', name: 'Insight Agent', description: 'Turns numbers into plain-English business insights.' },
  { step: 3, key: 'report_writer', name: 'Report Writer', description: 'Drafts a structured executive report.' },
  { step: 4, key: 'reviewer_agent', name: 'Reviewer', description: 'Polishes prose, verifies numbers, sharpens recommendations.' },
  { step: 5, key: 'delivery_agent', name: 'Delivery Agent', description: 'Generates the PDF and emails it to the client.' },
];

export default function ClientDetail() {
  const { clientId } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);

  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [statuses, setStatuses] = useState({});
  const [previews, setPreviews] = useState({});
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await fetchClient(clientId);
        if (alive) setClient(c);
      } catch (e) {
        if (alive) setError(e.message || 'Client not found');
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientId]);

  const startGeneration = () => {
    setStatuses({});
    setPreviews({});
    setResult(null);
    setRunError(null);
    setStreaming(true);

    const stream = streamReportGeneration(clientId, {
      onEvent: (event, payload) => {
        if (event === 'run_start') {
          if (payload.agents) setAgents(payload.agents);
        } else if (event === 'agent_update') {
          setStatuses((s) => ({ ...s, [payload.step]: payload.status }));
          if (payload.preview !== undefined) {
            setPreviews((p) => ({ ...p, [payload.step]: payload.preview }));
          }
        } else if (event === 'run_complete') {
          setResult(payload);
          setStreaming(false);
        } else if (event === 'run_error') {
          setRunError(payload.error || 'Unknown error');
          setStreaming(false);
        }
      },
      onError: (err) => {
        setRunError(err.message);
        setStreaming(false);
      },
    });
    return stream;
  };

  const summary = useMemo(() => {
    if (!client) return null;
    const totals = Object.values(client.metrics).reduce(
      (a, m) => ({
        spend: a.spend + m.spend,
        revenue: a.revenue + m.revenue,
        conversions: a.conversions + m.conversions,
      }),
      { spend: 0, revenue: 0, conversions: 0 },
    );
    return { ...totals, roi: totals.spend === 0 ? Infinity : totals.revenue / totals.spend };
  }, [client]);

  if (error) {
    return (
      <div className="p-10 max-w-3xl">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
        <Link to="/dashboard" className="text-brand text-sm mt-4 inline-block">← Back to dashboard</Link>
      </div>
    );
  }
  if (!client) return <div className="p-10 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <div className="mt-2 flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow"
              style={{ background: client.logo_color }}
            >
              {client.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <p className="text-sm text-slate-500">
                {client.industry} · {client.report_type} · {client.period} ·{' '}
                <span className="text-slate-700">{client.contact_name}</span>{' '}
                <span className="text-slate-400">({client.contact_email})</span>
              </p>
            </div>
          </div>
          <button
            disabled={streaming}
            onClick={startGeneration}
            className="bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-md shadow-sm transition"
          >
            {streaming ? 'Generating…' : result ? 'Regenerate Report' : 'Generate Report'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-3">
          <CounterPill
            label="Total spend"
            value={summary.spend}
            formatter={(n) => `$${Math.round(n).toLocaleString()}`}
          />
          <CounterPill
            label="Total revenue"
            value={summary.revenue}
            formatter={(n) => `$${Math.round(n).toLocaleString()}`}
          />
          <CounterPill
            label="Conversions"
            value={summary.conversions}
            formatter={(n) => Math.round(n).toLocaleString()}
          />
          <CounterPill
            label="Blended ROI"
            value={summary.roi}
            formatter={(n) => (summary.roi === Infinity ? '∞' : `${n.toFixed(2)}x`)}
            accent
          />
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Performance overview
        </h2>
        <ChannelCharts clientId={client.id} metrics={client.metrics} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Channel breakdown
        </h2>
        <MetricsTable metrics={client.metrics} />
      </section>

      {(streaming || Object.keys(statuses).length > 0 || result) && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Agent pipeline</h2>
          <p className="text-sm text-slate-500 mb-5">
            Live progress streamed from the backend via Server-Sent Events.
          </p>
          <AgentTimeline agents={agents} statuses={statuses} previews={previews} />
          {runError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-4 py-3 text-sm">
              Pipeline failed: {runError}
            </div>
          )}
        </section>
      )}

      {result && (
        <>
          <ReportPreview
            reportId={result.report_id}
            finalReport={result.final_report}
            emailStatus={result.email_status}
            generatedAt={new Date().toISOString()}
          />
          <ChatPanel reportId={result.report_id} clientName={client.name} />
        </>
      )}
    </div>
  );
}

function CounterPill({ label, value, formatter, accent }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 min-w-[140px] ${
        accent ? 'bg-brand/5 border-brand/30' : 'bg-white border-slate-200'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ? 'text-brand-dark' : 'text-slate-900'}`}>
        <AnimatedCounter value={value} formatter={formatter} />
      </div>
    </div>
  );
}

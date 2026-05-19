import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedCounter from '../components/AnimatedCounter.jsx';
import ClientCard from '../components/ClientCard.jsx';
import Logo from '../components/Logo.jsx';
import { fetchClient, fetchClients, fetchReports } from '../lib/api.js';

function StatTile({ label, value, hint, accent, icon, formatter }) {
  return (
    <div
      className={`flex-1 min-w-[160px] rounded-xl px-5 py-4 border ${
        accent
          ? 'bg-brand-gradient text-white border-transparent shadow-lg shadow-brand/20'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className={`flex items-center justify-between text-[11px] uppercase tracking-wider ${accent ? 'text-white/70' : 'text-slate-500'}`}>
        <span>{label}</span>
        <span className={`${accent ? 'opacity-70' : 'text-brand/70'}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold mt-1.5 ${accent ? 'text-white' : 'text-slate-900'}`}>
        <AnimatedCounter value={value} formatter={formatter || ((n) => Math.round(n).toLocaleString())} />
      </p>
      {hint && (
        <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-slate-500'}`}>{hint}</p>
      )}
    </div>
  );
}

function TopPerformerCard({ client, metrics, prevTotals }) {
  if (!client || !metrics) return null;
  const revenue = Object.values(metrics).reduce((a, m) => a + m.revenue, 0);
  const spend = Object.values(metrics).reduce((a, m) => a + m.spend, 0);
  const roi = spend === 0 ? Infinity : revenue / spend;
  const momPct = prevTotals && prevTotals.revenue > 0
    ? ((revenue - prevTotals.revenue) / prevTotals.revenue) * 100
    : null;

  return (
    <div className="bg-navy-gradient rounded-xl p-5 text-white relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
        <Logo variant="mark" className="w-40 h-40" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-cyan-100">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-light animate-soft-pulse" />
          Top Performer · {client.period}
        </div>
        <h3 className="text-2xl font-bold mt-1">{client.name}</h3>
        <p className="text-xs text-white/60">{client.industry}</p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-white/60">Revenue</div>
            <div className="text-xl font-bold">${revenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-white/60">Blended ROI</div>
            <div className="text-xl font-bold text-brand-light">
              {roi === Infinity ? '∞' : `${roi.toFixed(2)}x`}
            </div>
          </div>
          {momPct !== null && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">MoM</div>
              <div className={`text-xl font-bold ${momPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {momPct >= 0 ? '▲' : '▼'} {Math.abs(momPct).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        <Link
          to={`/clients/${client.id}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-light hover:text-white transition"
        >
          View report →
        </Link>
      </div>
    </div>
  );
}

function RecentReportsCard({ reports }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">Recent Reports</h3>
        <Link to="/reports" className="text-xs text-brand hover:text-brand-dark font-medium">
          View all →
        </Link>
      </div>
      {reports.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">
          No reports yet — generate one from a client below.
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.slice(0, 4).map((r) => {
            const dt = new Date(r.generated_at);
            return (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.client_name}</p>
                  <p className="text-[11px] text-slate-500">{dt.toLocaleString()}</p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    r.email_status === 'sent'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : r.email_status === 'error'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {r.email_status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [clientDetails, setClientDetails] = useState({});
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, r] = await Promise.all([fetchClients(), fetchReports()]);
        if (!alive) return;
        setClients(c.clients);
        setReports(r.reports);
        const detailEntries = await Promise.all(
          c.clients.map((cl) => fetchClient(cl.id).then((d) => [cl.id, d])),
        );
        if (!alive) return;
        setClientDetails(Object.fromEntries(detailEntries));
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const portfolio = useMemo(() => {
    const entries = Object.values(clientDetails);
    if (entries.length === 0) {
      return { revenue: 0, spend: 0, roi: 0, top: null, topPrev: null };
    }
    let totalRevenue = 0;
    let totalSpend = 0;
    let best = null;
    let bestRoi = -1;
    let bestPrev = null;
    for (const cl of entries) {
      const r = Object.values(cl.metrics).reduce((a, m) => a + m.revenue, 0);
      const s = Object.values(cl.metrics).reduce((a, m) => a + m.spend, 0);
      const roi = s === 0 ? Infinity : r / s;
      totalRevenue += r;
      totalSpend += s;
      if (roi !== Infinity && roi > bestRoi) {
        bestRoi = roi;
        best = cl;
        const prev = cl.history?.[cl.history.length - 1];
        bestPrev = prev
          ? {
              revenue: Object.values(prev.metrics).reduce((a, m) => a + m.revenue, 0),
              spend: Object.values(prev.metrics).reduce((a, m) => a + m.spend, 0),
            }
          : null;
      }
    }
    return {
      revenue: totalRevenue,
      spend: totalSpend,
      roi: totalSpend === 0 ? 0 : totalRevenue / totalSpend,
      top: best,
      topPrev: bestPrev,
    };
  }, [clientDetails]);

  const emailsSent = reports.filter((r) => r.email_status === 'sent').length;
  const reportsSorted = useMemo(
    () => [...reports].sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    [reports],
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <section className="bg-navy-gradient rounded-2xl px-7 py-7 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <Logo variant="mark" className="w-60 h-60" />
        </div>
        <div className="relative max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-light">
            Automated Client Intelligence
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1.5 leading-tight">
            Welcome back.
          </h1>
          <p className="text-white/70 mt-2 text-sm md:text-base">
            Pick a client and let five AI agents draft, review, and deliver a polished report in under a minute.
          </p>
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-4 py-3 text-sm">
          {error} — make sure the backend is running on port 8000.
        </div>
      )}

      {/* Stat tiles */}
      <section className="flex flex-wrap gap-4">
        <StatTile
          label="Active clients"
          value={clients.length}
          icon="◆"
          hint={clients.length ? `${new Set(clients.map((c) => c.industry)).size} industries` : null}
        />
        <StatTile
          label="Reports generated"
          value={reports.length}
          icon="▤"
          hint={reports.length ? 'this session' : null}
        />
        <StatTile
          label="Portfolio ROI"
          value={portfolio.roi}
          icon="↗"
          formatter={(n) => (n ? `${n.toFixed(2)}x` : '—')}
          hint={portfolio.revenue ? `$${Math.round(portfolio.revenue).toLocaleString()} revenue` : null}
          accent
        />
        <StatTile
          label="Emails sent"
          value={emailsSent}
          icon="✉"
          hint={emailsSent === 0 && reports.length > 0 ? 'check Resend config' : null}
        />
      </section>

      {/* Top performer + recent reports */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          {portfolio.top && (
            <TopPerformerCard
              client={portfolio.top}
              metrics={portfolio.top.metrics}
              prevTotals={portfolio.topPrev}
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <RecentReportsCard reports={reportsSorted} />
        </div>
      </section>

      {/* Clients */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Clients
          </h2>
          <span className="text-xs text-slate-400">{clients.length} total</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-56 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-lg mb-3" />
                <div className="h-3 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-2.5 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                detail={clientDetails[c.id]}
                lastReport={reportsSorted.find((r) => r.client_id === c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

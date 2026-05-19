import { Link } from 'react-router-dom';

function totals(metrics) {
  if (!metrics) return null;
  let revenue = 0;
  let spend = 0;
  for (const m of Object.values(metrics)) {
    revenue += m.revenue;
    spend += m.spend;
  }
  return {
    revenue,
    spend,
    roi: spend === 0 ? Infinity : revenue / spend,
  };
}

function momPct(detail) {
  if (!detail?.history?.length) return null;
  const prev = detail.history[detail.history.length - 1].metrics;
  const prevRev = Object.values(prev).reduce((a, m) => a + m.revenue, 0);
  const currRev = Object.values(detail.metrics).reduce((a, m) => a + m.revenue, 0);
  if (prevRev === 0) return null;
  return ((currRev - prevRev) / prevRev) * 100;
}

export default function ClientCard({ client, detail, lastReport }) {
  const t = totals(detail?.metrics);
  const mom = momPct(detail);

  const initials = client.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  return (
    <Link
      to={`/clients/${client.id}`}
      className="group relative bg-white rounded-xl border border-slate-200 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 transition p-5 flex flex-col"
    >
      {/* accent stripe */}
      <span
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full opacity-70 group-hover:opacity-100 transition"
        style={{ background: client.logo_color }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ background: client.logo_color }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
          <p className="text-xs text-slate-500">{client.industry}</p>
        </div>
      </div>

      {t ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Revenue</div>
            <div className="text-base font-bold text-slate-900">${t.revenue.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Blended ROI</div>
            <div className="text-base font-bold text-brand">
              {t.roi === Infinity ? '∞' : `${t.roi.toFixed(2)}x`}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-16 mb-4 bg-slate-50 rounded-md animate-pulse" />
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4">
        <span>
          {client.period}
          {mom !== null && (
            <span
              className={`ml-2 font-semibold ${
                mom >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {mom >= 0 ? '▲' : '▼'} {Math.abs(mom).toFixed(1)}% MoM
            </span>
          )}
        </span>
        {lastReport ? (
          <span className="text-emerald-600 font-medium">● Report ready</span>
        ) : (
          <span className="text-slate-400">No report yet</span>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">{client.report_type}</span>
        <span className="text-sm font-semibold text-brand group-hover:text-brand-dark transition">
          {lastReport ? 'Regenerate' : 'Generate'} →
        </span>
      </div>
    </Link>
  );
}

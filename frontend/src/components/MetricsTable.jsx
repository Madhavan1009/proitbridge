function fmt(n) {
  return n.toLocaleString();
}

function roiClass(roi) {
  if (roi === Infinity) return 'text-emerald-600 font-semibold';
  if (roi >= 4) return 'text-emerald-600 font-semibold';
  if (roi >= 2) return 'text-emerald-600';
  if (roi >= 1) return 'text-amber-600';
  return 'text-rose-600 font-semibold';
}

export default function MetricsTable({ metrics }) {
  const rows = Object.entries(metrics).map(([channel, m]) => {
    const roi = m.spend === 0 ? Infinity : m.revenue / m.spend;
    return { channel, ...m, roi };
  });

  const totals = rows.reduce(
    (a, r) => ({
      impressions: a.impressions + r.impressions,
      clicks: a.clicks + r.clicks,
      conversions: a.conversions + r.conversions,
      spend: a.spend + r.spend,
      revenue: a.revenue + r.revenue,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
  );
  const totalRoi = totals.spend === 0 ? Infinity : totals.revenue / totals.spend;

  return (
    <div className="overflow-hidden border border-slate-200 rounded-xl bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr className="text-left">
            <th className="px-4 py-3 font-semibold">Channel</th>
            <th className="px-4 py-3 font-semibold text-right">Impressions</th>
            <th className="px-4 py-3 font-semibold text-right">Clicks</th>
            <th className="px-4 py-3 font-semibold text-right">Conversions</th>
            <th className="px-4 py-3 font-semibold text-right">Spend</th>
            <th className="px-4 py-3 font-semibold text-right">Revenue</th>
            <th className="px-4 py-3 font-semibold text-right">ROI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.channel} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                {r.channel.replaceAll('_', ' ')}
              </td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt(r.impressions)}</td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt(r.clicks)}</td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt(r.conversions)}</td>
              <td className="px-4 py-3 text-right text-slate-700">${fmt(r.spend)}</td>
              <td className="px-4 py-3 text-right text-slate-700">${fmt(r.revenue)}</td>
              <td className={`px-4 py-3 text-right ${roiClass(r.roi)}`}>
                {r.roi === Infinity ? '∞' : `${r.roi.toFixed(2)}x`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold text-slate-800">
          <tr>
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right">{fmt(totals.impressions)}</td>
            <td className="px-4 py-3 text-right">{fmt(totals.clicks)}</td>
            <td className="px-4 py-3 text-right">{fmt(totals.conversions)}</td>
            <td className="px-4 py-3 text-right">${fmt(totals.spend)}</td>
            <td className="px-4 py-3 text-right">${fmt(totals.revenue)}</td>
            <td className={`px-4 py-3 text-right ${roiClass(totalRoi)}`}>
              {totalRoi === Infinity ? '∞' : `${totalRoi.toFixed(2)}x`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

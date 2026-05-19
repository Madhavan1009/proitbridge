import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchReports, reportPdfUrl } from '../lib/api.js';

const EMAIL_BADGE = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function ReportHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchReports();
        if (alive) setReports([...r.reports].reverse());
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Reports History</h1>
        <p className="text-slate-500 mt-1">All reports generated this session.</p>
      </header>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500">
          No reports yet. <Link to="/dashboard" className="text-brand font-medium">Generate one →</Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Generated</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.period}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(r.generated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        EMAIL_BADGE[r.email_status] || EMAIL_BADGE.skipped
                      }`}
                    >
                      {r.email_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={reportPdfUrl(r.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:text-brand-dark font-medium"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

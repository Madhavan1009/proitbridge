import { reportPdfUrl } from '../lib/api.js';

const VERDICT_STYLES = {
  '🏆': 'bg-amber-50 text-amber-800',
  '✅': 'bg-emerald-50 text-emerald-700',
  '⚠️': 'bg-rose-50 text-rose-700',
  '💎': 'bg-cyan-100 text-brand-dark',
};

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
}

function renderTable(rows, key) {
  if (rows.length < 2) return null;
  const header = rows[0].split('|').map((c) => c.trim()).filter(Boolean);
  const body = rows.slice(2).map((r) => r.split('|').map((c) => c.trim()).filter((_, i, a) => i < a.length));
  return (
    <div key={key} className="my-4 overflow-x-auto">
      <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold border-b border-slate-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {body.map((cells, ri) => (
            <tr key={ri} className="hover:bg-slate-50/60">
              {cells.map((c, ci) => {
                const verdictKey = Object.keys(VERDICT_STYLES).find((k) => c.startsWith(k));
                const cls = verdictKey ? `${VERDICT_STYLES[verdictKey]} font-medium` : '';
                return (
                  <td
                    key={ci}
                    className={`px-3 py-2 ${cls}`}
                    dangerouslySetInnerHTML={{ __html: inlineFormat(c) }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.trim().split(/\r?\n/);
  const out = [];
  let i = 0;
  let keyIx = 0;
  const k = () => `k${keyIx++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^##\s+/.test(line)) {
      out.push(<h2 key={k()}>{line.replace(/^##\s+/, '').trim()}</h2>);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(<h1 key={k()}>{line.replace(/^#\s+/, '').trim()}</h1>);
      i++;
      continue;
    }

    // Markdown table: header row, separator row, then body rows
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      out.push(renderTable(rows, k()));
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={k()} className="list-disc pl-6 space-y-1.5 my-2">
          {items.map((item, ix) => (
            <li
              key={ix}
              className="text-slate-700"
              dangerouslySetInnerHTML={{ __html: inlineFormat(item) }}
            />
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph — accumulate until blank line or block-level marker
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,2}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('|')
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    const html = inlineFormat(paraLines.join(' '));
    out.push(<p key={k()} dangerouslySetInnerHTML={{ __html: html }} />);
  }

  return out;
}

const EMAIL_BADGE = {
  sent: { label: 'Email sent', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  skipped: { label: 'Email skipped (demo mode)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  error: { label: 'Email failed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function ReportPreview({ reportId, finalReport, emailStatus, generatedAt }) {
  const badge = EMAIL_BADGE[emailStatus] || EMAIL_BADGE.skipped;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900">Generated Report</h3>
          <p className="text-xs text-slate-500">
            {generatedAt ? new Date(generatedAt).toLocaleString() : 'Just now'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${badge.cls}`}>
            {badge.label}
          </span>
          {reportId && (
            <a
              href={reportPdfUrl(reportId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-3.5 py-2 rounded-md"
            >
              ↓ Download PDF
            </a>
          )}
        </div>
      </div>
      <div className="report-prose px-6 py-6 max-h-[640px] overflow-y-auto">
        {renderMarkdown(finalReport)}
      </div>
    </div>
  );
}

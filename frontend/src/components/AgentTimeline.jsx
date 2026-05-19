const STATUS_STYLES = {
  waiting: {
    dot: 'bg-slate-200 border-slate-300 text-slate-400',
    label: 'Waiting',
    chip: 'bg-slate-100 text-slate-500',
  },
  running: {
    dot: 'bg-brand border-brand text-white animate-soft-pulse',
    label: 'Running…',
    chip: 'bg-brand/10 text-brand',
  },
  complete: {
    dot: 'bg-emerald-500 border-emerald-500 text-white',
    label: 'Complete',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  error: {
    dot: 'bg-rose-500 border-rose-500 text-white',
    label: 'Failed',
    chip: 'bg-rose-50 text-rose-700',
  },
};

function previewToString(p) {
  if (p == null) return '';
  if (typeof p === 'string') return p;
  return Object.entries(p)
    .map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`)
    .join(' · ');
}

export default function AgentTimeline({ agents, statuses, previews }) {
  return (
    <ol className="relative border-l-2 border-slate-200 ml-3 space-y-6">
      {agents.map((a) => {
        const status = statuses[a.step] || 'waiting';
        const styles = STATUS_STYLES[status];
        const preview = previews[a.step];
        return (
          <li key={a.step} className="ml-6">
            <span
              className={`absolute -left-[14px] flex items-center justify-center w-7 h-7 rounded-full border-2 font-semibold text-xs ${styles.dot}`}
            >
              {status === 'complete' ? '✓' : a.step}
            </span>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-900">{a.name}</h4>
              <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${styles.chip}`}>
                {styles.label}
              </span>
            </div>
            <p className="text-sm text-slate-500">{a.description}</p>
            {preview && (
              <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-mono break-words">
                {previewToString(preview)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

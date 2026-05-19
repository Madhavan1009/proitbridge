/**
 * PROITBRIDGE logo — globe icon + wordmark + tagline.
 *
 * Designed to sit on a dark navy background. Cyan accent matches the brand
 * palette: globe wires + "IT" highlight + tagline use #22d3ee (Cyan 500).
 *
 * `variant="full"` (default): globe + wordmark + tagline (sidebar header)
 * `variant="mark"`: globe only (favicon, PDF stamp, compact spots)
 */
export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'mark') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-label="PROITBRIDGE">
        <Globe cx={32} cy={32} r={26} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 260 70" className={className} aria-label="PROITBRIDGE">
      <Globe cx={28} cy={35} r={24} />
      <text
        x="66"
        y="40"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="24"
        fontWeight="800"
        letterSpacing="-0.5"
        fill="#ffffff"
      >
        PRO
        <tspan fill="#22d3ee">IT</tspan>
        BRIDGE
      </text>
      <text
        x="66"
        y="56"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="2"
        fill="#22d3ee"
      >
        STRIVE FOR BETTER FUTURE
      </text>
    </svg>
  );
}

function Globe({ cx, cy, r }) {
  return (
    <g>
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22d3ee" strokeWidth="1.6" />
      {/* latitude lines (horizontal ellipses) */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.85" />
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.6} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.65" />
      {/* equator highlight */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#22d3ee" strokeWidth="1" opacity="0.85" />
      {/* longitude lines (vertical ellipses) */}
      <ellipse cx={cx} cy={cy} rx={r * 0.45} ry={r} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.75" />
      <ellipse cx={cx} cy={cy} rx={r * 0.85} ry={r} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.55" />
      {/* center axis */}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#22d3ee" strokeWidth="1" opacity="0.6" />
    </g>
  );
}

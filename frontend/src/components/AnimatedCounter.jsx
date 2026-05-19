import { useEffect, useRef, useState } from 'react';

/**
 * Count-up animation. Eases from 0 to `value` over `duration` ms.
 * Reanimates whenever `value` changes.
 */
export default function AnimatedCounter({
  value,
  duration = 900,
  formatter = (n) => n.toLocaleString(),
  prefix = '',
  suffix = '',
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof value !== 'number' || !isFinite(value)) {
      setDisplay(value);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = null;
    const target = value;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (typeof value !== 'number' || !isFinite(value)) {
    return <span>{prefix}{value}{suffix}</span>;
  }

  return (
    <span>
      {prefix}
      {formatter(Math.round(display * 100) / 100)}
      {suffix}
    </span>
  );
}

import { useEffect, useId, useState } from 'react';
import { BAD, GOOD, MID } from '../ui';

// Tier colours get a brighter second stop so the arc reads as a gradient.
const END: Record<string, string> = { [GOOD]: '#a3e635', [BAD]: '#fb923c', [MID]: '#fde047' };

// Circular progress (0–1). Content is centred inside the ring. The arc grows
// from 0 on mount and animates whenever the value changes.
export default function Ring({
  value,
  size = 96,
  stroke = 8,
  color,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  label: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, value));
  const gid = useId();
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 7px ${color}77)` }} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor={END[color] ?? color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          // A round cap would still draw a dot at 0%.
          opacity={v === 0 ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

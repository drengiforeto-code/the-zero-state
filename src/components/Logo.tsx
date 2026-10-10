import { useId } from 'react';

// Brand mark: a "0" crossed by a single diagonal stroke — the empty set, i.e.
// "zero state" — in the brand gradient. Drawn with `pathLength={100}` so the
// stroke-draw animation (index.css) works regardless of the real path length.
export default function Logo({ size = 24, stroke = 1.5, animate = false }: { size?: number; stroke?: number; animate?: boolean }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="8" y1="44" x2="40" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#d946ef" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <ellipse className={animate ? 'logo-ring' : undefined} cx="24" cy="24" rx="12.5" ry="18.5" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" pathLength={100} />
      <line className={animate ? 'logo-slash' : undefined} x1="10" y1="41" x2="38" y2="7" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" pathLength={100} />
    </svg>
  );
}

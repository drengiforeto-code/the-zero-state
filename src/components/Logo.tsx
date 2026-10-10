// Brand mark: a hairline "0" crossed by a single diagonal stroke — the empty
// set, i.e. "zero state". Drawn with `pathLength={100}` so the stroke-draw
// animation (index.css) works regardless of the real path length.
export default function Logo({ size = 24, stroke = 1.5, animate = false }: { size?: number; stroke?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse className={animate ? 'logo-ring' : undefined} cx="24" cy="24" rx="12.5" ry="18.5" stroke="#f7931a" strokeWidth={stroke} strokeLinecap="round" pathLength={100} />
      <line className={animate ? 'logo-slash' : undefined} x1="10" y1="41" x2="38" y2="7" stroke="#f7931a" strokeWidth={stroke} strokeLinecap="round" pathLength={100} />
    </svg>
  );
}

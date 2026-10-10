import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { TIME_PUNCHES } from '../content';

const DAY_MS = 86_400_000;
// Hours a typical person is awake per day, for the "hours awake left" figure.
const AWAKE_HOURS = 16;

const fmtInt = new Intl.NumberFormat('es-ES');
const fmtPct = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const pad2 = (n: number) => String(n).padStart(2, '0');
// es-ES leaves 4-digit numbers ungrouped ("1321"); always group them ("1.321").
const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ISO-8601 week number.
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / DAY_MS + 1) / 7);
}

// Saturdays from today (inclusive) to Dec 31.
function weekendsLeft(d: Date): number {
  const y = d.getFullYear();
  const today = Date.UTC(y, d.getMonth(), d.getDate());
  const daysLeft = (Date.UTC(y, 11, 31) - today) / DAY_MS;
  const firstSat = (6 - d.getDay() + 7) % 7;
  return firstSat > daysLeft ? 0 : Math.floor((daysLeft - firstSat) / 7) + 1;
}

// Ticks every second while mounted.
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// "Realidad temporal": today's exact date, a live countdown to the end of the
// year and a blunt line about not wasting it. A grounding check, top of "Hoy".
export default function TimeReality() {
  const now = useNow();
  const [shift, setShift] = useState(0);

  const y = now.getFullYear();
  const start = new Date(y, 0, 1).getTime();
  const end = new Date(y + 1, 0, 1).getTime();
  const elapsed = (now.getTime() - start) / (end - start);
  const daysInYear = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / DAY_MS;
  const dayOfYear = (Date.UTC(y, now.getMonth(), now.getDate()) - Date.UTC(y, 0, 1)) / DAY_MS + 1;

  const left = Math.max(0, end - now.getTime());
  const units = [
    { value: Math.floor(left / DAY_MS), label: 'días', color: '#38d0ff' },
    { value: Math.floor(left / 3_600_000) % 24, label: 'horas', color: '#38bdf8' },
    { value: Math.floor(left / 60_000) % 60, label: 'min', color: '#38bdf8' },
    { value: Math.floor(left / 1000) % 60, label: 'seg', color: '#38bdf8' },
  ];
  const pct = fmtPct.format(elapsed * 100);

  const weekday = now.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
  const dayMonth = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const punch = TIME_PUNCHES[(dayOfYear - 1 + shift) % TIME_PUNCHES.length]
    .replace('{dias}', fmtInt.format(units[0].value))
    .replace('{pct}', pct)
    .replace('{anio}', String(y));

  return (
    <section className="hero" aria-label="Realidad temporal">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow m-0 flex items-center gap-1.5">
            Realidad temporal
          </p>
          <p className="m-0 mt-2.5 text-[24px] font-bold leading-7 tracking-tight text-fg">
            {weekday}, {dayMonth}
          </p>
          <p className="help mt-1 tabular-nums">
            {y} · Día {dayOfYear} de {daysInYear} · Semana {isoWeek(now)}
          </p>
        </div>
        <time className="shrink-0 pt-0.5 text-[13px] font-medium tabular-nums text-fg-2" dateTime={now.toISOString()}>
          {pad2(now.getHours())}:{pad2(now.getMinutes())}:{pad2(now.getSeconds())}
        </time>
      </div>

      <div className="mt-5">
        <p className="help m-0 mb-2">Para que se acabe el {y}</p>
        <div className="grid grid-cols-4 gap-2" role="timer" aria-label={`Faltan ${units[0].value} días para que termine el año`}>
          {units.map((u, i) => (
            <div
              key={u.label}
              className="rounded-control border px-2 py-3 text-center"
              style={{ background: 'var(--color-sunken)', borderColor: 'var(--color-line)' }}
            >
              <span
                className="block text-[26px] font-bold leading-none tracking-tight tabular-nums"
                style={{ color: u.color }}
              >
                {i === 0 ? u.value : pad2(u.value)}
              </span>
              <span className="mt-1.5 block text-[11px] text-fg-3">{u.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Avance del año" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(elapsed * 100)}>
          <div className="h-full rounded-full" style={{ width: `${elapsed * 100}%`, background: 'var(--grad-primary)' }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-fg-3">
          <span><span className="font-semibold tabular-nums text-fg-2">{pct}%</span> del {y} ya se fue</span>
          <span className="tabular-nums">
            {weekendsLeft(now)} fines de semana · ≈ {groupThousands(Math.round((left / 3_600_000) * (AWAKE_HOURS / 24)))} horas útiles (despierto)
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 border-t border-line pt-4">
        <p className="m-0 min-w-0 flex-1 border-l-4 border-pink pl-3 text-[15px] font-semibold leading-6 text-fg">{punch}</p>
        <button type="button" className="btn btn-secondary btn-sm btn-icon shrink-0" aria-label="Otra frase" title="Otra frase" onClick={() => setShift(shift + 1)}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

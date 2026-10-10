import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, TrendingUp } from 'lucide-react';
import type { HistoryRecord, PillarRecord, ReportView } from '../store';
import { WORLD_AVG } from '../content';
import { localDateStr } from '../lib/history';
import { sentence } from '../lib/text';
import { BAD, GOOD, MID, segClass, tierColor } from '../ui';
import HistoryList from './HistoryList';
import Ring from './Ring';

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  let d = `M${pts[0].x},${pts[0].y} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x},${p2.y} `;
  }
  return d;
}

const VIEWS: { id: ReportView; label: string }[] = [
  { id: 'daily', label: 'Diario' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'annual', label: 'Anual' },
];

// Average coherence needed for each rank (same thresholds as before).
const RANKS = [
  { min: 0, name: 'Recluta', color: '#f87171' },
  { min: 0.4, name: 'Disciplinado', color: '#c9c9c9' },
  { min: 0.6, name: 'Soberano', color: GOOD },
  { min: 0.8, name: 'Élite', color: GOOD },
];

const LEGEND = [
  { label: 'Sin registro', color: 'var(--color-line)' },
  { label: '< 50%', color: BAD },
  { label: '50–69%', color: MID },
  { label: '≥ 70%', color: GOOD },
];

const WIDE = '(min-width: 640px)';

// Consistency calendar: one square per day, weeks as columns (Monday first),
// coloured by that day's coherence. Wider screens show more weeks so the
// squares stay small.
function ConsistencyCalendar({ history }: { history: HistoryRecord[] }) {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const CAL_WEEKS = wide ? 36 : 20;

  const byDate = new Map(history.map((r) => [r.fecha, r.ratio]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (CAL_WEEKS - 1) * 7);
  const todayStr = localDateStr(today);

  const cells: { fecha: string; ratio: number | undefined; label: string }[] = [];
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const fecha = localDateStr(d);
    cells.push({ fecha, ratio: byDate.get(fecha), label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) });
  }
  const tracked = cells.filter((c) => c.ratio !== undefined).length;

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="section-title">🗓️ Constancia</h2>
        <p className="help m-0 tabular-nums">{tracked} {tracked === 1 ? 'día registrado' : 'días registrados'} · últimas {CAL_WEEKS} semanas</p>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-none text-fg-3" aria-hidden="true">
          {['L', '', 'X', '', 'V', '', 'D'].map((d, i) => (
            <span key={i} className="flex items-center">{d}</span>
          ))}
        </div>
        <div
          className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${CAL_WEEKS}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`Calendario de constancia: ${tracked} días registrados en las últimas ${CAL_WEEKS} semanas`}
        >
          {cells.map((c) => (
            <div
              key={c.fecha}
              title={c.ratio === undefined ? `${c.label}: sin registro` : `${c.label}: ${Math.round(c.ratio * 100)}%`}
              className="aspect-square rounded-[3px]"
              style={{
                background: c.ratio === undefined ? 'var(--color-line)' : tierColor(c.ratio),
                boxShadow: c.fecha === todayStr ? 'inset 0 0 0 1.5px var(--color-fg-2)' : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5 text-[11px] text-fg-3">
            <span className="size-2.5 rounded-[3px]" style={{ background: l.color }} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, color, caption }: { label: string; value: string | number; color?: string; caption?: string }) {
  return (
    <div className="card p-4">
      <p className="help m-0">{label}</p>
      <p className="metric m-0 mt-2" style={{ color: color ?? 'var(--color-fg)' }}>{value}</p>
      {caption && <p className="help mt-1">{caption}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports: every statistic is computed from CLOSED days only, so an empty
// history reads as zero. Today's in-progress day lives in the tracker header.
// ---------------------------------------------------------------------------

export default function ReportsView({
  history,
  loading,
  error,
  view,
  selectedIdx,
  onView,
  onSelect,
  onRetry,
  onSaveDay,
  onDeleteDay,
  onDeleteAll,
}: {
  history: HistoryRecord[];
  loading: boolean;
  error: string | null;
  view: ReportView;
  selectedIdx: number | null;
  onView: (view: ReportView) => void;
  onSelect: (idx: number | null) => void;
  onRetry: () => void;
  onSaveDay: (fecha: string, pillars: PillarRecord[]) => Promise<boolean>;
  onDeleteDay: (fecha: string) => Promise<boolean>;
  onDeleteAll: () => Promise<boolean>;
}) {
  const hasData = history.length > 0;
  const ratios = history.map((r) => r.ratio);

  // Last 7 closed days.
  const week = ratios.slice(-7);
  const sovereigntyDays = week.filter((v) => v >= 0.7).length;
  const slaveryDays = week.filter((v) => v < 0.5).length;

  let streakDays = 0;
  for (let i = ratios.length - 1; i >= 0 && ratios[i] >= 0.7; i--) streakDays++;
  let bestStreak = 0, run = 0;
  for (const v of ratios) {
    if (v >= 0.7) { run++; bestStreak = Math.max(bestStreak, run); } else run = 0;
  }

  const failTally: Record<string, number> = {};
  const pillarTotals: Record<string, { ok: number; total: number }> = {};
  history.forEach((r) => r.pillars.forEach((p) => {
    if (!p.ok) failTally[p.name] = (failTally[p.name] || 0) + 1;
    if (!pillarTotals[p.name]) pillarTotals[p.name] = { ok: 0, total: 0 };
    pillarTotals[p.name].total++;
    if (p.ok) pillarTotals[p.name].ok++;
  }));
  let weakestPillar = '', weakestCount = 0;
  Object.keys(failTally).forEach((name) => { if (failTally[name] > weakestCount) { weakestCount = failTally[name]; weakestPillar = name; } });
  const pillarBreakdown = Object.keys(pillarTotals).map((name) => {
    const t = pillarTotals[name];
    return { name, pct: t.total ? Math.round((t.ok / t.total) * 100) : 0 };
  }).sort((a, b) => b.pct - a.pct);

  // Trend series
  let rawSeries: { label: string; ratio: number }[];
  if (view === 'daily') {
    rawSeries = history.slice(-20).map((r) => ({ label: r.dateLabel, ratio: r.ratio }));
  } else {
    const groups: Record<string, { sum: number; count: number; label: string; order: number }> = {};
    history.forEach((r) => {
      const dateObj = new Date(r.fecha + 'T00:00:00');
      let key: string, label: string;
      if (view === 'weekly') {
        const sunday = new Date(dateObj);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        key = localDateStr(sunday);
        label = 'Sem. ' + sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      } else if (view === 'monthly') {
        key = dateObj.getFullYear() + '-' + dateObj.getMonth();
        label = dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else {
        key = String(dateObj.getFullYear());
        label = key;
      }
      if (!groups[key]) groups[key] = { sum: 0, count: 0, label, order: dateObj.getTime() };
      groups[key].sum += r.ratio;
      groups[key].count++;
    });
    rawSeries = Object.values(groups).sort((a, b) => a.order - b.order).map((g) => ({ label: g.label, ratio: g.sum / g.count }));
  }

  const n = rawSeries.length;
  const chartPoints = rawSeries.map((r, i) => ({
    idx: i,
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: 96 - Math.max(0, Math.min(1, r.ratio)) * 88,
    label: r.label,
    pct: Math.round(r.ratio * 100),
    color: tierColor(r.ratio),
    selected: selectedIdx === i,
  }));
  const linePath = smoothPath(chartPoints.map((p) => ({ x: p.x, y: p.y })));
  const worldY = (96 - WORLD_AVG * 88).toFixed(1);
  const worldPct = Math.round(WORLD_AVG * 100);
  const selected = selectedIdx !== null ? chartPoints[selectedIdx] : null;

  // Rank and world comparison
  const avg = hasData ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  const rankIdx = RANKS.reduce((acc, r, i) => (avg >= r.min ? i : acc), 0);
  const rank = hasData ? RANKS[rankIdx].name : 'Sin rango';
  const rankColor = hasData ? RANKS[rankIdx].color : MID;
  const nextRank = hasData ? RANKS[rankIdx + 1] : undefined;
  const toNext = nextRank ? Math.max(1, Math.ceil((nextRank.min - avg) * 100)) : 0;
  const tierProgress = nextRank ? (avg - RANKS[rankIdx].min) / (nextRank.min - RANKS[rankIdx].min) : 1;
  const deltaPts = Math.round((avg - WORLD_AVG) * 100);
  const beatsPct = Math.min(98, Math.max(2, Math.round(((avg - 0.1) / 0.9) * 100)));
  const globalLine = !hasData
    ? 'Cierra tu primer día para compararte con el promedio mundial.'
    : avg >= WORLD_AVG
      ? 'Estás por encima del promedio mundial. Sigue empujando — el top 1% no se detiene aquí.'
      : 'Estás debajo del promedio mundial. Cada pilar cumplido hoy te acerca al top.';

  return (
    <div className="anim-rise">
      <h1 className="page-title">Reportes</h1>
      <p className="page-sub">Analíticas · tiempo y soberanía</p>

      <div className="mt-6 flex flex-col gap-3">
        {loading && (
          <p className="m-0 flex items-center gap-2 text-[12px] text-fg-3" role="status">
            <LoaderCircle size={14} className="anim-spin" aria-hidden="true" />
            Cargando historial…
          </p>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            <CircleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-medium">No se pudo cargar el historial</p>
              <p className="m-0 mt-0.5 break-words text-[12px] opacity-90">{error}</p>
            </div>
            <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={onRetry}>Reintentar</button>
          </div>
        )}

        {/* Rank hero */}
        <section className="card" aria-label="Tu rango">
          <div className="flex items-center gap-5 sm:gap-7">
            <Ring value={avg} size={112} stroke={8} color={rankColor} label={`Promedio de coherencia: ${Math.round(avg * 100)}%`}>
              <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-fg">{hasData ? `${Math.round(avg * 100)}%` : '—'}</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-3">Promedio</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="help m-0">Tu rango</p>
              <p className="metric m-0 mt-0.5" style={{ color: rankColor }}>{rank}</p>
              {nextRank ? (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Progreso hacia ${nextRank.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tierProgress * 100)}>
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${tierProgress * 100}%`, background: rankColor }} />
                  </div>
                  <p className="help mt-2">Te faltan <span className="font-medium text-fg-2 tabular-nums">{toNext} pts</span> para {nextRank.name}</p>
                </>
              ) : (
                <p className="help mt-2">{hasData ? 'Rango máximo. Ahora toca sostenerlo.' : 'Cierra tu primer día para obtener rango.'}</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="help">🎯 Pilar más débil</span>
            <span className="min-w-0 truncate text-[13px]">
              <span className="font-medium" style={{ color: weakestCount > 0 ? 'var(--color-danger-fg)' : 'var(--color-fg-3)' }}>
                {weakestCount > 0 ? sentence(weakestPillar) : '—'}
              </span>
              {weakestCount > 0 && <span className="text-fg-3 tabular-nums"> · {weakestCount} {weakestCount === 1 ? 'fallo' : 'fallos'}</span>}
            </span>
          </div>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="👑 Días de soberanía" value={sovereigntyDays} color="var(--color-good)" caption="Últimos 7 días" />
          <Stat label="⛓️ Días de esclavitud" value={slaveryDays} color="var(--color-danger)" caption="Últimos 7 días" />
          <Stat label="🔥 Racha actual" value={streakDays} caption="Días seguidos" />
          <Stat label="🏆 Mejor racha" value={bestStreak} caption="Histórica" />
        </div>

        <ConsistencyCalendar history={history} />

        {/* Trend */}
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">📈 Tendencia de soberanía</h2>
            <div className="seg w-full sm:w-auto" role="group" aria-label="Periodo">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" className={segClass(view === v.id)} aria-pressed={view === v.id} onClick={() => onView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {n === 0 ? (
            <div className="empty mt-4">
              <TrendingUp size={20} aria-hidden="true" />
              <p className="m-0">Aún no hay días cerrados.<br />Cierra tu primer día para ver tu tendencia.</p>
            </div>
          ) : (
            <div className="mt-5 flex gap-3">
              <div className="relative h-[200px] w-8 shrink-0" aria-hidden="true">
                {[['100%', 8], ['50%', 52], ['0%', 96]].map(([label, y]) => (
                  <span key={label} className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-fg-3" style={{ top: `${y}%` }}>{label}</span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative h-[200px]">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                    <defs>
                      <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f5f5f5" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[8, 52, 96].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1f1f1f" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}
                    <line x1="0" y1={worldY} x2="100" y2={worldY} stroke="#8a8a8a" strokeWidth="1" strokeDasharray="4,4" opacity="0.6" vectorEffect="non-scaling-stroke" />
                    {n > 1 && <path d={`${linePath} L${chartPoints[n - 1].x},96 L${chartPoints[0].x},96 Z`} fill="url(#trend-area)" stroke="none" />}
                    <path d={linePath} fill="none" stroke="#d4d4d4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {/* Dots are HTML, not SVG: the SVG is stretched non-uniformly, which would turn circles into ellipses. */}
                  {chartPoints.map((p) => (
                    <button
                      key={p.idx}
                      type="button"
                      aria-label={`${p.label}: ${p.pct}%`}
                      className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      onMouseEnter={() => onSelect(p.idx)}
                      onFocus={() => onSelect(p.idx)}
                      onClick={() => onSelect(p.idx)}
                    >
                      <span className="block rounded-full transition-all duration-150" style={{ width: p.selected ? 12 : 8, height: p.selected ? 12 : 8, background: p.color, boxShadow: '0 0 0 2px var(--color-surface)' }} />
                    </button>
                  ))}
                  {selected && (
                    <div
                      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-control border bg-raised px-2.5 py-1 text-[12px] font-semibold tabular-nums"
                      style={{
                        left: `${selected.x}%`,
                        top: `${selected.y}%`,
                        transform: `translate(${selected.x < 18 ? '-12%' : selected.x > 82 ? '-88%' : '-50%'}, -150%)`,
                        borderColor: selected.color,
                        color: selected.color,
                      }}
                    >
                      {selected.label} · {selected.pct}%
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-fg-3">
                  <span>{rawSeries[0].label}</span>
                  <span className="flex items-center gap-1.5 text-fg-3">
                    <svg width="16" height="2" aria-hidden="true"><line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="4,3" /></svg>
                    Mundial {worldPct}%
                  </span>
                  <span>{rawSeries[n - 1].label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Per-habit compliance */}
        {pillarBreakdown.length > 0 && (
          <div className="card">
            <h2 className="section-title">Cumplimiento por pilar</h2>
            <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
              {pillarBreakdown.map((pb) => (
                <li key={pb.name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-fg-2">{sentence(pb.name)}</span>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: tierColor(pb.pct / 100) }}>{pb.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-label={sentence(pb.name)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pb.pct}>
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pb.pct}%`, background: tierColor(pb.pct / 100) }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* World comparison */}
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">🌍 Comparativa global</h2>
            <span className="badge">Estimada</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="metric m-0" style={{ color: hasData ? 'var(--color-good)' : 'var(--color-fg-3)' }}>{hasData ? `Top ${beatsPct}%` : '—'}</p>
              <p className="help mt-1">{hasData ? `Superas al ${beatsPct}% mundial` : 'Superas al — mundial'}</p>
            </div>
            <div>
              <p className="metric m-0" style={{ color: !hasData ? 'var(--color-fg-3)' : deltaPts >= 0 ? 'var(--color-good)' : 'var(--color-danger)' }}>
                {hasData ? `${deltaPts >= 0 ? '+' : ''}${deltaPts} pts` : '—'}
              </p>
              <p className="help mt-1">vs promedio mundial</p>
            </div>
          </div>
          <p className="m-0 mt-4 border-t border-line pt-4 text-[13px] leading-5 text-fg-2">{globalLine}</p>
        </div>

        {hasData && <HistoryList records={history} onSave={onSaveDay} onDelete={onDeleteDay} onDeleteAll={onDeleteAll} />}
      </div>
    </div>
  );
}

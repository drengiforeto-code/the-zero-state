import { BarChart3, ListChecks, Settings } from 'lucide-react';
import { APP_NAME } from '../content';
import type { Tab } from '../store';
import { tabClass, tierColor } from '../ui';
import Logo from './Logo';

export interface ProgressSegment {
  id: string;
  state: 'ok' | 'bad' | 'pending';
}

const TABS: { id: Tab; label: string; short: string; icon: typeof ListChecks }[] = [
  { id: 'tracker', label: 'Tracker', short: 'Hoy', icon: ListChecks },
  { id: 'reports', label: 'Reportes', short: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', short: 'Ajustes', icon: Settings },
];

const SEGMENT_COLOR = { ok: 'var(--color-good)', bad: 'var(--color-danger)', pending: 'var(--color-line-strong)' };

// Navigation: tabs on top from 640px up; on phones a native-style bottom bar.
// The day-progress strip stays pinned to the top on the tracker.
export default function AppHeader({
  tab,
  onTab,
  segments,
  coherence,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  // Shown only on the tracker tab. `coherence` is 0–1, or null before the day starts.
  segments: ProgressSegment[];
  coherence: number | null;
}) {
  const answered = segments.filter((s) => s.state !== 'pending').length;
  const showStrip = tab === 'tracker' && segments.length > 0;

  return (
    <>
      <header className="mx-auto flex max-w-[680px] items-center gap-2.5 px-4 pb-3 pt-[calc(20px+env(safe-area-inset-top))] sm:px-6">
        <Logo size={26} stroke={1.6} />
        <span className="text-[12px] font-light uppercase tracking-[0.3em] text-fg">{APP_NAME}</span>
      </header>

      <div
        className={`sticky top-0 z-10 bg-[var(--page-bg)] transition-colors duration-200 ${showStrip ? 'border-b border-line' : 'sm:border-b sm:border-line'}`}
      >
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <nav className="tabs hidden sm:flex" role="tablist" aria-label="Secciones">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tabClass(tab === id)} onClick={() => onTab(id)}>
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          {showStrip && (
            <div className="pb-3 pt-3 sm:pt-1">
              <div className="mb-2 flex items-center justify-between text-[12px] text-fg-3">
                <span className="tabular-nums">{answered} de {segments.length} registrados</span>
                {coherence !== null && (
                  <span className="font-medium tabular-nums" style={{ color: tierColor(coherence) }}>
                    {Math.round(coherence * 100)}% de coherencia
                  </span>
                )}
              </div>
              <div
                className="flex gap-[3px]"
                role="progressbar"
                aria-label="Hábitos registrados hoy"
                aria-valuemin={0}
                aria-valuemax={segments.length}
                aria-valuenow={answered}
              >
                {segments.map((s) => (
                  <div key={s.id} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: SEGMENT_COLOR[s.state] }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="bottom-nav sm:hidden" role="tablist" aria-label="Secciones">
        {TABS.map(({ id, short, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`bottom-tab ${tab === id ? 'bottom-tab-on' : ''}`} onClick={() => onTab(id)}>
            <Icon size={22} strokeWidth={tab === id ? 2 : 1.6} aria-hidden="true" />
            <span>{short}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

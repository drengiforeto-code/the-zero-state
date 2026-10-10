import { BarChart3, ListChecks, Settings } from 'lucide-react';
import type { Tab } from '../store';
import { tabClass, tierColor } from '../ui';

export const APP_NAME = 'Zero State';

export interface ProgressSegment {
  id: string;
  state: 'ok' | 'bad' | 'pending';
}

// Brand mark: concentric rings (same shape as the favicon).
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="17" stroke="#f7931a" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="8" stroke="#f7931a" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="2.5" fill="#f7931a" />
    </svg>
  );
}

const TABS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: 'tracker', label: 'Tracker', icon: ListChecks },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const SEGMENT_COLOR = { ok: 'var(--color-accent)', bad: 'var(--color-danger)', pending: 'var(--color-line-strong)' };

// Brand row scrolls away; the nav (tabs + day progress) stays pinned.
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

  return (
    <>
      <header className="mx-auto flex max-w-[680px] items-center gap-2.5 px-4 pb-3 pt-5 sm:px-6">
        <Mark />
        <span className="text-[15px] font-semibold tracking-tight text-fg">{APP_NAME}</span>
      </header>

      <nav className="sticky top-0 z-10 border-b border-line bg-[var(--page-bg)] transition-colors duration-200" aria-label="Secciones">
        <div className="mx-auto max-w-[680px] px-4 sm:px-6">
          <div className="tabs" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tabClass(tab === id)} onClick={() => onTab(id)}>
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {tab === 'tracker' && segments.length > 0 && (
            <div className="pb-3 pt-1">
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
      </nav>
    </>
  );
}

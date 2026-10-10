import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_HABITS, emptyEntry } from './habits';
import type { HabitDef, HabitEntry } from './habits';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tab = 'tracker' | 'reports' | 'settings';
export type ReportView = 'daily' | 'weekly' | 'monthly' | 'annual';
export type Tone = 'green' | 'red';

export interface PillarRecord {
  id: string;
  name: string;
  ok: boolean;
}

export interface HistoryRecord {
  fecha: string;
  ratio: number;
  dateLabel: string;
  shortLabel: string;
  pillars: PillarRecord[];
  notes: { tag: string; text: string }[];
}

export interface ToastState {
  message: string;
  tone: Tone;
}

export interface SummaryState {
  pct: number;
  improve: string[];
  quote: string;
  callout: string;
}

export interface AppState {
  tab: Tab;
  // Habit definitions. Supabase (`habitos`) is the source of truth; this is
  // the local cache used until it loads, or if it's unreachable.
  habits: HabitDef[];
  habitsSynced: boolean; habitsError: string | null;
  // Last habit layout migration applied (see migrateHabitLayout).
  habitLayout: number;
  // Today's answers, keyed by habit id.
  entries: Record<string, HabitEntry>;
  // dayDate / closedDate: the tracked day ('YYYY-MM-DD', see logicalDateStr)
  // the day was started / closed for. A closed day from an earlier date is
  // cleared automatically so a new one can start.
  dayStarted: boolean; dayStartTime: string; dayDate: string;
  closed: boolean; closedTime: string; closedDate: string; summary: SummaryState | null; summaryDismissed: boolean;
  dbHistory: HistoryRecord[]; dbLoading: boolean; dbError: string | null;
  reportView: ReportView; selectedPointIdx: number | null;
  toast: ToastState | null; flash: boolean;
}

interface AppStore extends AppState {
  patch: (p: Partial<AppState>) => void;
}

// ---------------------------------------------------------------------------
// Initial state — no seed/demo data: production always boots from a clean
// slate (the default habit definitions are config, not tracked data).
// ---------------------------------------------------------------------------

function buildInitialState(): AppState {
  return {
    tab: 'tracker',
    habits: DEFAULT_HABITS,
    habitsSynced: false, habitsError: null, habitLayout: 0,
    entries: {},
    dayStarted: false, dayStartTime: '', dayDate: '',
    closed: false, closedTime: '', closedDate: '', summary: null, summaryDismissed: false,
    dbHistory: [], dbLoading: false, dbError: null,
    reportView: 'daily', selectedPointIdx: null,
    toast: null, flash: false,
  };
}

// Fields intentionally excluded from persistence: they're ephemeral UI state
// (toast/flash animations, current tab/chart view) that should never survive
// a reload — only real tracked records should. dbHistory/dbLoading/dbError
// and the habit sync flags mirror Supabase and are refetched on load.
const TRANSIENT_KEYS = [
  'toast', 'flash', 'tab', 'reportView', 'selectedPointIdx', 'patch',
  'dbHistory', 'dbLoading', 'dbError', 'habitsSynced', 'habitsError',
] as const;

// ---------------------------------------------------------------------------
// v0 -> v1 migration: before habits were configurable, each habit had its own
// hardcoded fields (sleep/sleepQuicks/…). Convert an in-progress day into
// per-habit entries, and turn the old "extra habits" into real HabitDefs.
// ---------------------------------------------------------------------------

type LegacyState = Record<string, unknown> & {
  lookmax?: Record<string, 'done' | 'skip' | null>;
  extraHabits?: { id: string; name: string; status: 'done' | 'failed' | null }[];
};

function migrateV0(old: LegacyState): Partial<AppState> {
  const entries: Record<string, HabitEntry> = {};
  const legacy: [id: string, field: string, quicks: string | null, notes: string | null][] = [
    ['sleep', 'sleep', 'sleep', null], ['pray', 'pray', 'pray', 'prayNotes'], ['work', 'workDone', 'work', 'workNote'],
    ['gym', 'gym', 'gym', null], ['diet', 'diet', 'diet', null], ['protein', 'protein', 'protein', null],
    ['minox', 'minox', 'minox', null], ['nofap', 'nofap', 'nofap', null], ['scroll', 'scroll', 'scroll', null],
  ];
  for (const [id, field, q, notes] of legacy) {
    const value = old[field] as string | null | undefined;
    const nota = notes ? (old[notes] as string) || '' : '';
    if (!value && !nota) continue;
    entries[id] = {
      ...emptyEntry(),
      opcion: value ?? null,
      razones: (old[q + 'Quicks'] as string[]) || [],
      otro: !!old[q + 'Other'],
      custom: (old[q + 'Custom'] as string) || '',
      nota,
    };
  }
  const lm = old.lookmax;
  if (lm && (lm.ice || lm.jaw || lm.eyes)) {
    const sub: HabitEntry['subtareas'] = {};
    if (lm.ice) sub['HIELO EN LOS OJOS'] = lm.ice;
    if (lm.jaw) sub['EJERCICIO DE JAWLINE'] = lm.jaw;
    if (lm.eyes) sub['EJERCICIO DE OJOS'] = lm.eyes;
    entries.lookmax = { ...emptyEntry(), subtareas: sub };
  }

  const extras = old.extraHabits ?? [];
  const habits: HabitDef[] = [
    ...DEFAULT_HABITS,
    ...extras.map((x, i): HabitDef => ({
      id: x.id, nombre: x.name, pregunta: '', porQue: '', bloque: 'dia', orden: DEFAULT_HABITS.length + i, activo: true,
      opciones: [{ id: 'done', label: 'LOGRADO', ok: true }, { id: 'failed', label: 'FALLIDO', ok: false }],
      subtareas: [], razones: [], razonObligatoria: false, conNota: false,
    })),
  ];
  for (const x of extras) if (x.status) entries[x.id] = { ...emptyEntry(), opcion: x.status };

  return {
    habits,
    entries,
    // The old app unlocked the day on any activity, so keep that day open.
    dayStarted: !!old.dayStarted || Object.keys(entries).length > 0,
    dayStartTime: (old.dayStartTime as string) || '',
    closed: !!old.closed,
    closedTime: (old.closedTime as string) || '',
    summary: (old.summary as SummaryState) ?? null,
    summaryDismissed: !!old.summaryDismissed,
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      patch: (p) => set(p),
    }),
    {
      name: 'sovereign-os-storage-v3',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        if (version === 0) return migrateV0((persisted ?? {}) as LegacyState) as AppStore;
        if (version === 1) {
          // v1 kept a boolean for the first layout migration.
          const { nightHabitsMoved, ...rest } = (persisted ?? {}) as Record<string, unknown>;
          return { ...rest, habitLayout: nightHabitsMoved ? 1 : 0 } as unknown as AppStore;
        }
        return persisted as AppStore;
      },
      partialize: (state) => {
        const persisted = { ...state } as Partial<AppStore>;
        for (const key of TRANSIENT_KEYS) delete persisted[key];
        return persisted;
      },
    },
  ),
);

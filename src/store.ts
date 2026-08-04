import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type YesNo = 'yes' | 'no' | null;
export type KeptFailed = 'kept' | 'failed' | null;
export type GymStatus = 'go' | 'home' | 'none' | null;
export type DoneSkip = 'done' | 'skip' | null;
export type Tab = 'tracker' | 'reports' | 'settings';
export type ReportView = 'daily' | 'weekly' | 'monthly' | 'annual';
export type Tone = 'green' | 'red';

export interface LookmaxState {
  ice: DoneSkip;
  jaw: DoneSkip;
  eyes: DoneSkip;
}

export interface PillarRecord {
  id: string;
  name: string;
  ok: boolean;
}

export interface HistoryRecord {
  ratio: number;
  dateLabel: string;
  shortLabel: string;
  workDone: string | null;
  sleepReason: string;
  gymReason: string;
  workNote: string;
  workReason?: string;
  prayNotes: string;
  prayReason?: string;
  scrollReason?: string;
  nofapReason?: string;
  dietReason?: string;
  minoxReason?: string;
  proteinReason?: string;
  pillars: PillarRecord[];
}

export interface ExtraHabit {
  id: string;
  name: string;
  status: 'done' | 'failed' | null;
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
  nofap: KeptFailed; nofapQuicks: string[]; nofapCustom: string; nofapOther: boolean;
  diet: YesNo; dietQuicks: string[]; dietCustom: string; dietOther: boolean;
  protein: YesNo; proteinQuicks: string[]; proteinCustom: string; proteinOther: boolean;
  minox: YesNo; minoxQuicks: string[]; minoxCustom: string; minoxOther: boolean;
  workDone: YesNo; workNote: string; workQuicks: string[]; workCustom: string; workOther: boolean;
  sleep: YesNo; sleepQuicks: string[]; sleepCustom: string; sleepOther: boolean;
  gym: GymStatus; gymQuicks: string[]; gymCustom: string; gymOther: boolean;
  scroll: YesNo; scrollQuicks: string[]; scrollCustom: string; scrollOther: boolean;
  lookmax: LookmaxState;
  pray: YesNo; prayNotes: string; prayQuicks: string[]; prayCustom: string; prayOther: boolean;
  extraHabits: ExtraHabit[];
  newHabitName: string;
  closed: boolean; closedTime: string; summary: SummaryState | null; summaryDismissed: boolean;
  history: HistoryRecord[];
  expandedIdx: number | null;
  reportView: ReportView; selectedPointIdx: number | null;
  toast: ToastState | null; flash: boolean;
}

interface AppStore extends AppState {
  patch: (p: Partial<AppState>) => void;
}

// ---------------------------------------------------------------------------
// Initial state — every habit, counter, streak and failure reason starts
// empty. No seed/demo data: production always boots from a clean slate.
// ---------------------------------------------------------------------------

function buildInitialState(): AppState {
  return {
    tab: 'tracker',
    nofap: null, nofapQuicks: [], nofapCustom: '', nofapOther: false,
    diet: null, dietQuicks: [], dietCustom: '', dietOther: false,
    protein: null, proteinQuicks: [], proteinCustom: '', proteinOther: false,
    minox: null, minoxQuicks: [], minoxCustom: '', minoxOther: false,
    workDone: null, workNote: '', workQuicks: [], workCustom: '', workOther: false,
    sleep: null, sleepQuicks: [], sleepCustom: '', sleepOther: false,
    gym: null, gymQuicks: [], gymCustom: '', gymOther: false,
    scroll: null, scrollQuicks: [], scrollCustom: '', scrollOther: false,
    lookmax: { ice: null, jaw: null, eyes: null },
    pray: null, prayNotes: '', prayQuicks: [], prayCustom: '', prayOther: false,
    extraHabits: [],
    newHabitName: '',
    closed: false, closedTime: '', summary: null, summaryDismissed: false,
    history: [],
    expandedIdx: null,
    reportView: 'daily', selectedPointIdx: null,
    toast: null, flash: false,
  };
}

// Fields intentionally excluded from persistence: they're ephemeral UI state
// (toast/flash animations, current tab/chart view, in-progress drafts) that
// should never survive a reload — only real tracked records should.
const TRANSIENT_KEYS = ['toast', 'flash', 'tab', 'reportView', 'selectedPointIdx', 'expandedIdx', 'newHabitName', 'patch'] as const;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      patch: (p) => set(p),
    }),
    {
      name: 'sovereign-os-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const persisted = { ...state } as Partial<AppStore>;
        for (const key of TRANSIENT_KEYS) delete persisted[key];
        return persisted;
      },
    },
  ),
);

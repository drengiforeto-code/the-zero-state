import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from './store';
import { supabase, supabaseConfigError } from './lib/supabase';
import { fetchHabits, upsertHabits } from './lib/habitsRepo';
import { fetchDay, saveDay } from './lib/dayRepo';
import type { DayDraft } from './lib/dayRepo';
import type { SyncState } from './components/AppHeader';
import { dbRowToHistoryRecord, localDateStr, logicalDateStr, longDateLabel } from './lib/history';
import type { DiaCerradoDetalle, DiaCerradoRow } from './lib/history';
import { sentence } from './lib/text';
import { BLOQUES, HABIT_LAYOUT_VERSION, isAnswered, isBlocking, isOk, migrateHabitLayout, reasonText } from './habits';
import type { Bloque, HabitDef, HabitEntry } from './habits';
import type { PillarRecord, SummaryState, Tone } from './store';
import { calloutPool, genericQuote, stoicQuotes, successCallouts } from './content';
import AppHeader from './components/AppHeader';
import ReportsView from './components/ReportsView';
import SettingsTab from './components/SettingsTab';
import Splash from './components/Splash';
import SummaryModal from './components/SummaryModal';
import Toast from './components/Toast';
import TrackerView from './components/TrackerView';

// A blank tracked day (also what an old closed day is reset to).
const NEW_DAY = {
  dayStarted: false, dayStartTime: '', dayDate: '',
  entries: {},
  closed: false, closedTime: '', closedDate: '', summary: null, summaryDismissed: false,
};

// Debounce for saving the day in progress to the cloud after each change.
const DAY_SAVE_MS = 700;

const daySignature = (d: Pick<DayDraft, 'entries' | 'dayStarted' | 'dayStartTime' | 'dayDate' | 'closed' | 'closedTime' | 'closedDate'>) =>
  JSON.stringify([d.entries, d.dayStarted, d.dayStartTime, d.dayDate, d.closed, d.closedTime, d.closedDate]);

const BOOT_MIN_MS = 1500;
const BOOT_MAX_MS = 5000;

const blockRank = (b: Bloque) => BLOQUES.findIndex((x) => x.id === b);

// ---------------------------------------------------------------------------
// App: owns the state and every side effect (Supabase, toasts, closing the
// day). Rendering lives in the components.
// ---------------------------------------------------------------------------

export default function App() {
  const state = useAppStore();
  const patch = state.patch;
  const toastTimeout = useRef<number | null>(null);
  const flashTimeout = useRef<number | null>(null);

  const fetchHistory = async () => {
    if (!supabase) {
      patch({ dbLoading: false, dbError: supabaseConfigError });
      return;
    }
    patch({ dbLoading: true, dbError: null });
    const { data, error } = await supabase
      .from('dias_cerrados')
      .select('*')
      .order('fecha', { ascending: true });
    if (error) {
      patch({ dbLoading: false, dbError: error.message });
      return;
    }
    patch({ dbHistory: (data ?? []).map((row) => dbRowToHistoryRecord(row as DiaCerradoRow)), dbLoading: false });
  };

  // Supabase is the source of truth for habit config. An empty table means
  // first run: seed it with whatever this device has (defaults + old extras).
  const loadHabits = async () => {
    const { habits, error } = await fetchHabits();
    const layout = useAppStore.getState().habitLayout;
    if (error || !habits) {
      // Supabase unreachable (or the habitos table is missing): still apply
      // pending layout changes to this device's copy so the tracker updates.
      const local = migrateHabitLayout(useAppStore.getState().habits, layout);
      patch({ habits: local.habits, habitLayout: HABIT_LAYOUT_VERSION, habitsError: error });
      return;
    }
    if (habits.length === 0) {
      const seed = migrateHabitLayout(useAppStore.getState().habits, layout).habits;
      const seedError = await upsertHabits(seed);
      patch(seedError ? { habitsError: seedError } : { habits: seed, habitsSynced: true, habitsError: null, habitLayout: HABIT_LAYOUT_VERSION });
      return;
    }
    // Pending layout migrations (e.g. moving habits to another block) run once.
    if (layout < HABIT_LAYOUT_VERSION) {
      const migrated = migrateHabitLayout(habits, layout);
      const saveError = migrated.changed.length ? await upsertHabits(migrated.changed) : null;
      patch(saveError
        ? { habits, habitsSynced: true, habitsError: saveError }
        : { habits: migrated.habits, habitsSynced: true, habitsError: null, habitLayout: HABIT_LAYOUT_VERSION });
      return;
    }
    patch({ habits, habitsSynced: true, habitsError: null });
  };

  // -------------------------------------------------------------------------
  // History editing. Rows are addressed by `fecha` (unique per day). Supabase
  // reports a blocked write (missing RLS policy) as success with 0 rows, so
  // every write asks for the affected rows back and checks them.
  // -------------------------------------------------------------------------

  const updateDay = async (fecha: string, pillars: PillarRecord[]): Promise<boolean> => {
    if (!supabase) { showToast('Supabase no está configurado: ' + supabaseConfigError, 'red'); return false; }
    const { data, error } = await supabase.from('dias_cerrados').select('detalle').eq('fecha', fecha).single();
    if (error || !data) { showToast('No se pudo leer ese día: ' + (error?.message ?? 'no existe'), 'red'); return false; }
    const prev = data.detalle as DiaCerradoDetalle;
    const reasons = new Map((prev.vectores_ataque ?? []).map((v) => [v.pilar, v.razon]));
    const detalle: DiaCerradoDetalle = {
      ...prev,
      pillars,
      habitos_logrados: pillars.filter((p) => p.ok).map((p) => p.name),
      vectores_ataque: pillars.filter((p) => !p.ok).map((p) => ({ pilar: p.name, razon: reasons.get(p.name) ?? '' })),
    };
    const score = pillars.length ? Math.round((pillars.filter((p) => p.ok).length / pillars.length) * 100) : 0;
    const { data: updated, error: updateError } = await supabase
      .from('dias_cerrados').update({ score_coherencia: score, detalle }).eq('fecha', fecha).select('fecha');
    if (updateError) { showToast('No se pudo guardar: ' + updateError.message, 'red'); return false; }
    if (!updated?.length) { showToast('No se guardó nada: Supabase bloqueó la edición.', 'red'); return false; }
    showToast('Día actualizado.', 'green');
    fetchHistory();
    return true;
  };

  const deleteBlockedMessage = 'Supabase bloqueó el borrado. Falta el permiso de borrar: ejecuta el SQL de borrado (está en database_schema.sql).';

  const deleteDay = async (fecha: string): Promise<boolean> => {
    if (!supabase) { showToast('Supabase no está configurado: ' + supabaseConfigError, 'red'); return false; }
    const { data, error } = await supabase.from('dias_cerrados').delete().eq('fecha', fecha).select('fecha');
    if (error) { showToast('No se pudo borrar: ' + error.message, 'red'); return false; }
    if (!data?.length) { showToast(deleteBlockedMessage, 'red'); return false; }
    showToast('Día borrado.', 'green');
    fetchHistory();
    return true;
  };

  const deleteAllDays = async (): Promise<boolean> => {
    if (!supabase) { showToast('Supabase no está configurado: ' + supabaseConfigError, 'red'); return false; }
    const { data, error } = await supabase.from('dias_cerrados').delete().gte('fecha', '1900-01-01').select('fecha');
    if (error) { showToast('No se pudo borrar: ' + error.message, 'red'); return false; }
    if (!data?.length) { showToast(deleteBlockedMessage, 'red'); return false; }
    showToast(`Historial borrado (${data.length} días).`, 'green');
    fetchHistory();
    return true;
  };

  // -------------------------------------------------------------------------
  // Day in progress → cloud. Every change to the day is stamped and saved
  // (debounced); on load, and when the app comes back to the foreground, the
  // newer of the local and cloud copies wins. Without the `dia_actual` table
  // the app keeps working on this device only.
  // -------------------------------------------------------------------------

  const [sync, setSync] = useState<SyncState>('idle');
  const dayReady = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const warnedOff = useRef(false);
  const daySig = daySignature(state);
  const prevSig = useRef(daySig);

  const snapshotDay = (): DayDraft => {
    const st = useAppStore.getState();
    const { entries, dayStarted, dayStartTime, dayDate, closed, closedTime, closedDate, dayUpdatedAt } = st;
    return { entries, dayStarted, dayStartTime, dayDate, closed, closedTime, closedDate, ts: dayUpdatedAt };
  };

  const pushDay = async () => {
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    setSync('saving');
    const error = await saveDay(snapshotDay());
    if (error) {
      setSync('error');
      showToast('No se pudo guardar tu día en la nube: ' + error, 'red');
      return;
    }
    setSync('saved');
  };

  const syncDay = async () => {
    const { draft, error } = await fetchDay();
    dayReady.current = true;
    if (error) {
      setSync('off');
      if (!warnedOff.current) {
        warnedOff.current = true;
        showToast('Tu día en curso solo se guarda en este dispositivo: falta la tabla dia_actual en Supabase.', 'red');
      }
      return;
    }
    const st = useAppStore.getState();
    const hasLocal = st.dayStarted || st.closed || Object.keys(st.entries).length > 0;
    // A day saved before stamps existed counts as "now" so it isn't overwritten.
    if (hasLocal && st.dayUpdatedAt === 0) patch({ dayUpdatedAt: Date.now() });
    const local = useAppStore.getState().dayUpdatedAt;
    if (draft && draft.ts > local) {
      prevSig.current = daySignature(draft);
      patch({ ...draft, dayUpdatedAt: draft.ts, summary: null, summaryDismissed: true });
      setSync('saved');
    } else if (local > (draft?.ts ?? 0)) {
      await pushDay();
    } else {
      setSync('saved');
    }
  };

  useEffect(() => {
    if (prevSig.current === daySig) return;
    prevSig.current = daySig;
    patch({ dayUpdatedAt: Date.now() });
    // Before the first sync, that sync pushes whatever is newer.
    if (!dayReady.current) return;
    setSync('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(pushDay, DAY_SAVE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySig]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (saveTimer.current) pushDay();
      } else if (dayReady.current && !saveTimer.current) {
        syncDay();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot screen: stays until the first load settles (never longer than
  // BOOT_MAX_MS, so a slow network can't trap the user) and never shorter than
  // BOOT_MIN_MS, so the logo animation can finish.
  const [boot, setBoot] = useState<'loading' | 'leaving' | 'gone'>('loading');

  useEffect(() => {
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const firstLoad = Promise.race([Promise.allSettled([fetchHistory(), loadHabits(), syncDay()]), wait(BOOT_MAX_MS)]);
    Promise.all([firstLoad, wait(BOOT_MIN_MS)]).then(() => {
      setBoot('leaving');
      window.setTimeout(() => setBoot('gone'), 450);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message: string, tone: Tone) => {
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    patch({ toast: { message, tone } });
    toastTimeout.current = window.setTimeout(() => patch({ toast: null }), 4200);
  };

  const triggerFlash = () => {
    if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
    patch({ flash: true });
    flashTimeout.current = window.setTimeout(() => patch({ flash: false }), 900);
  };

  const onFeedback = (ok: boolean, message: string) => {
    showToast(message, ok ? 'green' : 'red');
    if (!ok) triggerFlash();
  };

  const setEntry = (id: string, entry: HabitEntry) => patch({ entries: { ...state.entries, [id]: entry } });

  // Local first so the UI never waits on the network; Supabase failures keep
  // the change on this device and surface the sync error in settings.
  const saveHabits = async (changed: HabitDef[]) => {
    const byId = new Map(state.habits.map((h) => [h.id, h]));
    changed.forEach((h) => byId.set(h.id, h));
    patch({ habits: [...byId.values()] });
    const error = await upsertHabits(changed);
    if (error) {
      patch({ habitsError: error });
      showToast('Guardado solo en este dispositivo — Supabase no respondió.', 'red');
    } else {
      patch({ habitsError: null, habitsSynced: true });
      showToast('Configuración guardada.', 'green');
    }
  };

  const startDay = () => {
    patch({
      dayStarted: true,
      dayStartTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dayDate: logicalDateStr(),
    });
    showToast('Día iniciado. A partir de ahora, cada movimiento cuenta.', 'green');
    // The start block folds away; bring the rest of the day into view.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Drops an unfinished day from an earlier date (it was never closed).
  const discardDay = () => {
    patch({ ...NEW_DAY, tab: 'tracker' });
    showToast('Nuevo día. Responde cómo llegas y arranca.', 'green');
  };

  // Day rollover: once the tracked date changes, a closed day is cleared so
  // the tracker opens on a fresh day. Checked on load, when the app comes back
  // to the foreground, and every minute while it's open.
  useEffect(() => {
    const check = () => {
      const st = useAppStore.getState();
      const today = logicalDateStr();
      // State saved before days carried a date: date it from the last
      // closed day in the history (or today) instead of guessing.
      if (st.closed && !st.closedDate) {
        if (st.dbLoading) return;
        st.patch({ closedDate: st.dbHistory.at(-1)?.fecha ?? today });
        return;
      }
      if (st.dayStarted && !st.dayDate) { st.patch({ dayDate: today }); return; }
      // Leave the end-of-day summary on screen until it's dismissed.
      if (st.closed && st.closedDate < today && (st.summaryDismissed || !st.summary)) st.patch(NEW_DAY);
    };
    check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(check, 60_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(id); };
  }, [state.dbLoading, state.summaryDismissed]);

  // -------------------------------------------------------------------------
  // Derived values for today
  // -------------------------------------------------------------------------

  const s = state;

  const activeHabits = s.habits
    .filter((h) => h.activo)
    .sort((a, b) => blockRank(a.bloque) - blockRank(b.bloque) || a.orden - b.orden);
  const habitNumber = new Map(activeHabits.map((h, i) => [h.id, i + 1]));
  const inicioHabits = activeHabits.filter((h) => h.bloque === 'inicio');

  // "Inicio" habits (sleep, prayer, last night's routines…) describe how you
  // arrive at the day, so every one of them must be answered before it starts.
  const startBlocker = inicioHabits.find((h) => !isAnswered(h, s.entries[h.id]) || isBlocking(h, s.entries[h.id]));
  const closeBlocker = activeHabits.find((h) => isBlocking(h, s.entries[h.id]));
  const blockerText = (h: HabitDef | undefined, goal: string) =>
    !h ? '' : !isAnswered(h, s.entries[h.id]) ? `Responde «${sentence(h.nombre)}» para ${goal}.` : `Falta la razón de «${sentence(h.nombre)}».`;
  const canClose = !closeBlocker && !s.closed;
  const today = logicalDateStr();
  const shownDate = s.closed ? s.closedDate || today : s.dayStarted ? s.dayDate || today : today;
  // A started day from an earlier date that was never closed.
  const staleDay = s.dayStarted && !s.closed && !!s.dayDate && s.dayDate < today;

  const pillarMeta: PillarRecord[] = activeHabits.map((h) => ({ id: h.id, name: h.nombre, ok: isOk(h, s.entries[h.id]) }));
  const todayRatio = pillarMeta.length ? pillarMeta.filter((p) => p.ok).length / pillarMeta.length : 0;
  const failedPillars = pillarMeta.filter((p) => !p.ok);

  // Before the day starts the progress strip tracks only the start-of-day questions.
  const progressHabits = s.dayStarted ? activeHabits : inicioHabits;
  const segments = progressHabits.map((h) => ({
    id: h.id,
    state: !isAnswered(h, s.entries[h.id]) ? ('pending' as const) : isOk(h, s.entries[h.id]) ? ('ok' as const) : ('bad' as const),
  }));

  // The time-reality card already shows today's date; name the tracked day only when it differs.
  const dateLabel = shownDate !== localDateStr(new Date()) ? longDateLabel(shownDate) : '';
  const summaryVisible = s.closed && !!s.summary && !s.summaryDismissed;

  // Writes the day to the history (insert, or update if it was saved before).
  // The date is the day it was started for, so closing late never lands on
  // the next day.
  const persistDay = async (): Promise<boolean> => {
    if (!supabase) {
      showToast('Supabase no está configurado: ' + supabaseConfigError, 'red');
      return false;
    }
    const detalle: DiaCerradoDetalle = {
      habitos_logrados: pillarMeta.filter((p) => p.ok).map((p) => p.name),
      vectores_ataque: failedPillars.map((p) => ({ pilar: p.name, razon: reasonText(s.entries[p.id]) })),
      pillars: pillarMeta,
      notas: activeHabits
        .filter((h) => s.entries[h.id]?.nota.trim())
        .map((h) => ({ pilar: h.nombre, nota: s.entries[h.id].nota.trim() })),
      respuestas: s.entries,
      horaInicio: s.dayStartTime || undefined,
    };
    const { error } = await supabase.from('dias_cerrados').upsert({
      fecha: s.closedDate || s.dayDate || today,
      score_coherencia: Math.round(todayRatio * 100),
      detalle,
    }, { onConflict: 'fecha' });
    if (error) {
      showToast('No se pudo guardar en Supabase: ' + error.message, 'red');
      return false;
    }
    return true;
  };

  const onCloseDay = async () => {
    if (!canClose) return;
    const now = new Date();

    const quoteId = failedPillars.length ? failedPillars[0].id : 'perfect';
    const summary: SummaryState = {
      pct: Math.round(todayRatio * 100),
      improve: failedPillars.map((p) => p.name),
      quote: stoicQuotes[quoteId] ?? genericQuote,
      callout: failedPillars.length
        ? calloutPool[Math.floor(Math.random() * calloutPool.length)]
        : successCallouts[Math.floor(Math.random() * successCallouts.length)],
    };

    // Persist before touching local state — if this fails the day must NOT
    // be marked closed, so nothing is lost.
    if (!(await persistDay())) return;

    patch({
      closed: true,
      closedTime: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      closedDate: s.dayDate || today,
      summary,
      summaryDismissed: false,
    });
    showToast('Día cerrado. La auditoría de hoy queda registrada en tu historial real.', 'green');
    fetchHistory();
  };

  // Saves corrections made to a day that's already closed.
  const saveClosedDay = async (): Promise<boolean> => {
    if (closeBlocker) { showToast(blockerText(closeBlocker, 'guardar'), 'red'); return false; }
    if (!(await persistDay())) return false;
    showToast('Cambios guardados en tu historial.', 'green');
    fetchHistory();
    return true;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="app-bg min-h-screen text-fg transition-colors duration-200"
      style={{ '--page-bg': s.flash ? '#2a0a14' : '#070c16' } as CSSProperties}
    >
      <AppHeader tab={s.tab} onTab={(tab) => patch({ tab })} segments={segments} coherence={s.dayStarted ? todayRatio : null} sync={sync} />

      <main className="mx-auto max-w-[680px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-8 sm:px-6">
        {s.tab === 'tracker' && (
          <TrackerView
            dateLabel={dateLabel}
            dayStarted={s.dayStarted}
            dayStartTime={s.dayStartTime}
            closed={s.closed}
            closedTime={s.closedTime}
            staleDayLabel={staleDay ? longDateLabel(s.dayDate) : ''}
            habits={activeHabits}
            entries={s.entries}
            habitNumber={habitNumber}
            startHint={blockerText(startBlocker, 'iniciar el día')}
            closeHint={blockerText(closeBlocker, 'cerrar el día')}
            canClose={canClose}
            onStart={startDay}
            onClose={onCloseDay}
            onSaveClosed={saveClosedDay}
            onSetEntries={(entries) => patch({ entries })}
            onDiscardDay={discardDay}
            onChangeEntry={setEntry}
            onFeedback={onFeedback}
          />
        )}

        {s.tab === 'reports' && (
          <ReportsView
            history={s.dbHistory}
            loading={s.dbLoading}
            error={s.dbError}
            view={s.reportView}
            selectedIdx={s.selectedPointIdx}
            onView={(reportView) => patch({ reportView, selectedPointIdx: null })}
            onSelect={(selectedPointIdx) => patch({ selectedPointIdx })}
            onRetry={fetchHistory}
            onSaveDay={updateDay}
            onDeleteDay={deleteDay}
            onDeleteAll={deleteAllDays}
          />
        )}

        {s.tab === 'settings' && (
          <SettingsTab habits={s.habits} syncError={s.habitsError} onSave={saveHabits} onError={(msg) => showToast(msg, 'red')} />
        )}
      </main>

      {summaryVisible && s.summary && <SummaryModal summary={s.summary} closedTime={s.closedTime} onClose={() => patch({ summaryDismissed: true })} />}
      {boot !== 'gone' && <Splash leaving={boot === 'leaving'} />}
      {s.toast && <Toast toast={s.toast} onDismiss={() => patch({ toast: null })} />}
    </div>
  );
}

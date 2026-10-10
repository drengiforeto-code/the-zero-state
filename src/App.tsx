import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from './store';
import { supabase, supabaseConfigError } from './lib/supabase';
import { fetchHabits, upsertHabits } from './lib/habitsRepo';
import { dbRowToHistoryRecord, localDateStr } from './lib/history';
import type { DiaCerradoDetalle, DiaCerradoRow } from './lib/history';
import { sentence } from './lib/text';
import { BLOQUES, isAnswered, isBlocking, isOk, moveNightHabitsToInicio, reasonText } from './habits';
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
    if (error || !habits) { patch({ habitsError: error }); return; }
    if (habits.length === 0) {
      const seed = moveNightHabitsToInicio(useAppStore.getState().habits).habits;
      const seedError = await upsertHabits(seed);
      patch(seedError ? { habitsError: seedError } : { habits: seed, habitsSynced: true, habitsError: null, nightHabitsMoved: true });
      return;
    }
    // One-off: habits about last night move to the start-of-day block.
    if (!useAppStore.getState().nightHabitsMoved) {
      const moved = moveNightHabitsToInicio(habits);
      const moveError = moved.changed.length ? await upsertHabits(moved.changed) : null;
      patch(moveError
        ? { habits, habitsSynced: true, habitsError: moveError }
        : { habits: moved.habits, habitsSynced: true, habitsError: null, nightHabitsMoved: true });
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

  // Boot screen: stays until the first load settles (never longer than
  // BOOT_MAX_MS, so a slow network can't trap the user) and never shorter than
  // BOOT_MIN_MS, so the logo animation can finish.
  const [boot, setBoot] = useState<'loading' | 'leaving' | 'gone'>('loading');

  useEffect(() => {
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const firstLoad = Promise.race([Promise.allSettled([fetchHistory(), loadHabits()]), wait(BOOT_MAX_MS)]);
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
    });
    showToast('Día iniciado. A partir de ahora, cada movimiento cuenta.', 'green');
    // The start block folds away; bring the rest of the day into view.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startNewDay = () => {
    patch({
      dayStarted: false, dayStartTime: '',
      entries: {},
      closed: false, closedTime: '', summary: null, summaryDismissed: false, tab: 'tracker',
    });
    showToast('Nuevo día. Responde cómo llegas y arranca.', 'green');
  };

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

  const pillarMeta: PillarRecord[] = activeHabits.map((h) => ({ id: h.id, name: h.nombre, ok: isOk(h, s.entries[h.id]) }));
  const todayRatio = pillarMeta.length ? pillarMeta.filter((p) => p.ok).length / pillarMeta.length : 0;
  const failedPillars = pillarMeta.filter((p) => !p.ok);

  // Before the day starts the progress strip tracks only the start-of-day questions.
  const progressHabits = s.dayStarted ? activeHabits : inicioHabits;
  const segments = progressHabits.map((h) => ({
    id: h.id,
    state: !isAnswered(h, s.entries[h.id]) ? ('pending' as const) : isOk(h, s.entries[h.id]) ? ('ok' as const) : ('bad' as const),
  }));

  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  const summaryVisible = s.closed && !!s.summary && !s.summaryDismissed;

  const onCloseDay = async () => {
    if (s.closed) { startNewDay(); return; }
    if (!canClose) return;
    const now = new Date();

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

    const quoteId = failedPillars.length ? failedPillars[0].id : 'perfect';
    const summary: SummaryState = {
      pct: Math.round(todayRatio * 100),
      improve: failedPillars.map((p) => p.name),
      quote: stoicQuotes[quoteId] ?? genericQuote,
      callout: failedPillars.length
        ? calloutPool[Math.floor(Math.random() * calloutPool.length)]
        : successCallouts[Math.floor(Math.random() * successCallouts.length)],
    };

    if (!supabase) {
      showToast('Supabase no está configurado: ' + supabaseConfigError, 'red');
      return;
    }

    // Persist to Supabase before touching local state — if this fails, the
    // board must NOT be marked closed/cleared, so nothing is lost.
    // Upsert on `fecha`: closing "today" twice (re-closing after starting a
    // new day within the same calendar date, or retrying) amends today's
    // row instead of hitting the unique constraint.
    const { error } = await supabase.from('dias_cerrados').upsert({
      fecha: localDateStr(now),
      score_coherencia: Math.round(todayRatio * 100),
      detalle,
    }, { onConflict: 'fecha' });

    if (error) {
      showToast('No se pudo guardar en Supabase: ' + error.message, 'red');
      return;
    }

    patch({
      closed: true,
      closedTime: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      summary,
      summaryDismissed: false,
    });
    showToast('Día cerrado. La auditoría de hoy queda registrada en tu historial real.', 'green');
    fetchHistory();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen bg-[var(--page-bg)] text-fg transition-colors duration-200"
      style={{ '--page-bg': s.flash ? '#2a0808' : '#0a0a0a' } as CSSProperties}
    >
      <AppHeader tab={s.tab} onTab={(tab) => patch({ tab })} segments={segments} coherence={s.dayStarted ? todayRatio : null} />

      <main className="mx-auto max-w-[680px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-8 sm:px-6">
        {s.tab === 'tracker' && (
          <TrackerView
            dateLabel={dateLabel}
            dayStarted={s.dayStarted}
            dayStartTime={s.dayStartTime}
            closed={s.closed}
            habits={activeHabits}
            entries={s.entries}
            habitNumber={habitNumber}
            startHint={blockerText(startBlocker, 'iniciar el día')}
            closeHint={blockerText(closeBlocker, 'cerrar el día')}
            canClose={canClose}
            onStart={startDay}
            onClose={onCloseDay}
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

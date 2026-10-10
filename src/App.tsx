import { Fragment, useEffect, useRef } from 'react';
import { Circle, BarChart3, Settings } from 'lucide-react';
import { useAppStore } from './store';
import { supabase, supabaseConfigError } from './lib/supabase';
import { fetchHabits, upsertHabits } from './lib/habitsRepo';
import { BLOQUES, isAnswered, isBlocking, isOk, moveNightHabitsToInicio, reasonText } from './habits';
import type { Bloque, HabitDef, HabitEntry } from './habits';
import type { HistoryRecord, PillarRecord, SummaryState, Tone } from './store';
import HabitCard from './components/HabitCard';
import SettingsTab from './components/SettingsTab';
import HistoryList from './components/HistoryList';
import { cardClass, cardHeadClass, sectionLabelClass, tabBtnClass, tierColor, viewBtnClass, whyClass } from './ui';

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const stoicQuotes: Record<string, string> = {
  nofap: 'La cagaste. Le regalaste tu disciplina a cinco minutos de nada. Mañana no hay excusa.',
  diet: 'Comiste basura sabiendo que no debías. Deja de mentirte y arréglalo mañana mismo.',
  minox: 'Un día que no aplicaste es un día que le restaste al resultado que quieres ver.',
  work: 'Perdiste el día. Nadie te lo regala de vuelta — mañana lo compensas con intensidad, no con excusas.',
  sleep: 'Dormiste mal y lo vas a arrastrar todo el día. Corrige la rutina de noche, no la lamentes de día.',
  gym: 'No fuiste. Así de simple. Tu cuerpo no espera a que tengas ganas.',
  scroll: 'Le entregaste tu atención a una pantalla. Esa hora no vuelve. Mañana la reclamas.',
  lookmax: 'Te saltaste los detalles. Nadie construye una mejor versión de sí mismo a medias.',
  pray: 'Ni cinco minutos de quietud te diste. Así se acumula el ruido que después te explota.',
  protein: 'No le diste a tu cuerpo lo que necesitaba para recuperarse. Estás dejando resultados en la mesa.',
  perfect: 'Día perfecto. Ahora la presión es no bajar el nivel mañana.',
};
const genericQuote = 'Dijiste que lo harías y no lo hiciste. La palabra que te das a ti mismo es la primera que tienes que cumplir.';

const calloutPool = [
  'Sé honesto: hoy no dio tu mejor versión. Que la incomodidad de leer esto sea la razón para no repetirlo mañana.',
  'Esto no es un examen que repruebas y ya. Es tu vida diaria. Actúa como si importara, porque importa.',
  'Nadie te va a aplaudir por intentarlo. Te van a respetar por sostenerlo. Hoy no lo sostuviste.',
  'Deja de justificarte. Levántate mañana y hazlo distinto — es la única corrección que cuenta.',
  'La versión de ti que quieres ser no se construye perdonándote cada fallo sin cambiar nada.',
  'Guárdate la excusa. Nadie la va a necesitar cuando veas el resultado en tres meses — ni tú.',
  'Hoy fue mediocre y lo sabes. La pregunta no es qué pasó, es qué vas a hacer distinto en 12 horas.',
];

const successCallouts = [
  'Cumpliste. No te relajes: mañana el estándar es el mismo, no menos.',
  'Un día bien cerrado no es la meta, es el mínimo. Repítelo hasta que sea aburrido.',
  'Bien. Ahora la trampa es pensar que ya te lo ganaste y bajar la guardia mañana.',
];

const WORLD_AVG = 0.52;

// ---------------------------------------------------------------------------
// Pure helpers
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

// Local calendar date as 'YYYY-MM-DD'. NOT toISOString().slice(0,10) — that
// converts to UTC first, so the day rolls over at UTC midnight rather than
// the user's actual local midnight (hours off in most timezones).
function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const blockRank = (b: Bloque) => BLOQUES.findIndex((x) => x.id === b);

// ---------------------------------------------------------------------------
// Supabase row <-> HistoryRecord mapping
// ---------------------------------------------------------------------------

interface DiaCerradoDetalle {
  habitos_logrados: string[];
  vectores_ataque: { pilar: string; razon: string }[];
  pillars: PillarRecord[];
  notas?: { pilar: string; nota: string }[];
  respuestas?: Record<string, HabitEntry>;
  horaInicio?: string;
  // Legacy fields from before habits were configurable.
  workNote?: string;
  prayNotes?: string;
}

interface DiaCerradoRow {
  id: string;
  fecha: string;
  score_coherencia: number;
  detalle: DiaCerradoDetalle;
  created_at: string;
}

function dbRowToHistoryRecord(row: DiaCerradoRow): HistoryRecord {
  const d = new Date(row.fecha + 'T00:00:00');
  const detalle = row.detalle;
  const notes = [
    ...(detalle.vectores_ataque ?? []).filter((v) => v.razon).map((v) => ({ tag: v.pilar, text: v.razon })),
    ...(detalle.notas ?? []).map((n) => ({ tag: n.pilar, text: n.nota })),
    ...(detalle.workNote ? [{ tag: 'TRABAJO ÓPTIMO', text: detalle.workNote }] : []),
    ...(detalle.prayNotes ? [{ tag: 'ORAR', text: detalle.prayNotes }] : []),
  ];
  return {
    fecha: row.fecha,
    ratio: row.score_coherencia / 100,
    dateLabel: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    shortLabel: d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 1).toUpperCase(),
    pillars: detalle.pillars ?? [],
    notes,
  };
}

// ---------------------------------------------------------------------------
// App
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

  useEffect(() => {
    fetchHistory();
    loadHabits();
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
  // Derived values (recomputed every render — cheap enough for this app size)
  // -------------------------------------------------------------------------

  const s = state;

  const activeHabits = s.habits
    .filter((h) => h.activo)
    .sort((a, b) => blockRank(a.bloque) - blockRank(b.bloque) || a.orden - b.orden);
  const habitNumber = new Map(activeHabits.map((h, i) => [h.id, i + 1]));
  const inicioHabits = activeHabits.filter((h) => h.bloque === 'inicio');

  // "Inicio" habits (sleep, prayer…) describe how you arrive at the day, so
  // every one of them must be answered before the day can start.
  const startBlocker = inicioHabits.find((h) => !isAnswered(h, s.entries[h.id]) || isBlocking(h, s.entries[h.id]));
  const closeBlocker = activeHabits.find((h) => isBlocking(h, s.entries[h.id]));
  const blockerText = (h: HabitDef | undefined, verb: string) =>
    !h ? '' : !isAnswered(h, s.entries[h.id]) ? `RESPONDE ${h.nombre} PARA ${verb}.` : `FALTA LA RAZÓN DE ${h.nombre}.`;
  const canClose = !closeBlocker && !s.closed;

  // Before the day starts the strip tracks only the start-of-day questions.
  const stripHabits = s.dayStarted ? activeHabits : inicioHabits;
  const stripAnswered = stripHabits.filter((h) => isAnswered(h, s.entries[h.id])).length;

  const pillarMeta: PillarRecord[] = activeHabits.map((h) => ({ id: h.id, name: h.nombre, ok: isOk(h, s.entries[h.id]) }));
  const todayRatio = pillarMeta.length ? pillarMeta.filter((p) => p.ok).length / pillarMeta.length : 0;
  const failedPillars = pillarMeta.filter((p) => !p.ok);

  const last6 = s.dbHistory.slice(-6);
  const fullHistory = [...last6.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
  const sovereigntyDays = fullHistory.filter((v) => v >= 0.7).length;
  const slaveryDays = fullHistory.filter((v) => v < 0.5).length;
  let streakDays = 0;
  for (let i = fullHistory.length - 1; i >= 0; i--) {
    if (fullHistory[i] >= 0.7) streakDays++;
    else break;
  }

  const allTimeline = [...s.dbHistory.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
  let bestStreak = 0, run = 0;
  for (let i = 0; i < allTimeline.length; i++) {
    if (allTimeline[i] >= 0.7) { run++; bestStreak = Math.max(bestStreak, run); } else run = 0;
  }

  const failTally: Record<string, number> = {};
  s.dbHistory.forEach((r) => r.pillars.forEach((p) => { if (!p.ok) failTally[p.name] = (failTally[p.name] || 0) + 1; }));
  let weakestPillar = '—', weakestCount = 0;
  Object.keys(failTally).forEach((name) => { if (failTally[name] > weakestCount) { weakestCount = failTally[name]; weakestPillar = name; } });

  const pillarTotals: Record<string, { ok: number; total: number }> = {};
  s.dbHistory.forEach((r) => r.pillars.forEach((p) => {
    if (!pillarTotals[p.name]) pillarTotals[p.name] = { ok: 0, total: 0 };
    pillarTotals[p.name].total++;
    if (p.ok) pillarTotals[p.name].ok++;
  }));
  const pillarBreakdown = Object.keys(pillarTotals).map((name) => {
    const t = pillarTotals[name];
    const pct = t.total ? Math.round((t.ok / t.total) * 100) : 0;
    return { name, pct, color: pct >= 70 ? '#f7931a' : pct < 50 ? '#ff3333' : '#8a8a8a' };
  }).sort((a, b) => b.pct - a.pct);

  const hasTodayActivity = Object.keys(s.entries).length > 0;
  const includeToday = !s.closed && hasTodayActivity;

  let rawSeries: { label: string; ratio: number }[] = [];
  if (s.reportView === 'daily') {
    const win = s.dbHistory.slice(-20);
    rawSeries = win.map((r) => ({ label: r.dateLabel, ratio: r.ratio }));
    if (includeToday) rawSeries.push({ label: 'HOY', ratio: todayRatio });
  } else {
    const groupBy = s.reportView;
    const withDate = s.dbHistory.map((r) => ({ ratio: r.ratio, dateObj: new Date(r.fecha + 'T00:00:00') }));
    if (includeToday) withDate.push({ ratio: todayRatio, dateObj: new Date() });
    const groups: Record<string, { sum: number; count: number; label: string; order: number }> = {};
    withDate.forEach((item) => {
      let key: string, label: string;
      if (groupBy === 'weekly') {
        const sunday = new Date(item.dateObj);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        key = localDateStr(sunday);
        label = 'DOM ' + sunday.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      } else if (groupBy === 'monthly') {
        key = item.dateObj.getFullYear() + '-' + item.dateObj.getMonth();
        label = item.dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase();
      } else {
        key = String(item.dateObj.getFullYear());
        label = key;
      }
      if (!groups[key]) groups[key] = { sum: 0, count: 0, label, order: item.dateObj.getTime() };
      groups[key].sum += item.ratio;
      groups[key].count++;
    });
    rawSeries = Object.values(groups).sort((a, b) => a.order - b.order).map((g) => ({ label: g.label, ratio: g.sum / g.count }));
  }

  const n = rawSeries.length;
  const toXY = (v: number, i: number) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: 96 - Math.max(0, Math.min(1, v)) * 88,
  });
  const chartPoints = rawSeries.map((r, i) => {
    const xy = toXY(r.ratio, i);
    return {
      idx: i, x: xy.x, y: xy.y, label: r.label,
      pct: Math.round(r.ratio * 100), color: tierColor(r.ratio),
      selected: s.selectedPointIdx === i,
      dotR: s.selectedPointIdx === i ? 3.4 : 2.2,
    };
  });
  const linePath = smoothPath(chartPoints.map((p) => ({ x: p.x, y: p.y })));
  const worldLineY = (96 - WORLD_AVG * 88).toFixed(1);
  const worldPct = Math.round(WORLD_AVG * 100);
  const trendStartLabel = rawSeries.length ? rawSeries[0].label : '';
  const trendEndLabel = rawSeries.length ? rawSeries[rawSeries.length - 1].label : '';
  const selectedPoint = s.selectedPointIdx !== null ? chartPoints[s.selectedPointIdx] : null;

  const allRatios = [...s.dbHistory.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
  const yourAvg = allRatios.length ? allRatios.reduce((a, b) => a + b, 0) / allRatios.length : 0;
  let rank = 'RECLUTA', rankColor = '#ff8080';
  if (yourAvg >= 0.8) { rank = 'ÉLITE'; rankColor = '#f7931a'; }
  else if (yourAvg >= 0.6) { rank = 'SOBERANO'; rankColor = '#f7931a'; }
  else if (yourAvg >= 0.4) { rank = 'DISCIPLINADO'; rankColor = '#c9c9c9'; }
  const deltaPts = Math.round((yourAvg - WORLD_AVG) * 100);
  const beatsPct = Math.min(98, Math.max(2, Math.round(((yourAvg - 0.1) / 0.9) * 100)));
  const globalLine = yourAvg >= WORLD_AVG
    ? 'Estás por encima del promedio mundial. Sigue empujando — el top 1% no se detiene aquí.'
    : 'Estás debajo del promedio mundial. Cada pilar cumplido hoy te acerca al top.';
  const deltaLabel = (deltaPts >= 0 ? '+' : '') + deltaPts + ' PTS';
  const deltaColor = deltaPts >= 0 ? '#f7931a' : '#ff3333';

  const today = new Date();
  const todayLabel = today.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase();

  const summaryVisible = s.closed && !!s.summary && !s.summaryDismissed;

  useEffect(() => {
    if (!summaryVisible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') patch({ summaryDismissed: true }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summaryVisible, patch]);

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

  const renderHabit = (h: HabitDef) => (
    <HabitCard
      key={h.id}
      habit={h}
      number={habitNumber.get(h.id) ?? 0}
      entry={s.entries[h.id]}
      onChange={(e) => setEntry(h.id, e)}
      onFeedback={onFeedback}
    />
  );

  const bigBtnStyle = (enabled: boolean) => ({
    cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? '#f7931a' : '#1a1a1a',
    color: enabled ? '#0a0a0a' : '#555',
    boxShadow: enabled ? '0 0 24px rgba(247,147,26,0.55)' : 'none',
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen text-[#e5e5e5] transition-colors duration-200"
      style={{ background: s.flash ? '#2a0808' : '#0a0a0a' }}
    >
      <div className="max-w-[460px] mx-auto px-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div
          className="flex flex-col gap-3.5 pt-[22px] pb-4 sticky top-0 z-[5] transition-colors duration-200"
          style={{ background: s.flash ? '#2a0808' : '#0a0a0a' }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[19px] font-bold text-[#f2f2f2] tracking-wide">THE SOVEREIGN OS</span>
            <span className="text-[19px] text-[#f7931a] animate-tzs-blink">_</span>
          </div>
          <div className="flex gap-1 border border-[#232323] rounded-sm p-1" role="tablist">
            <button role="tab" aria-selected={s.tab === 'tracker'} className={tabBtnClass(s.tab === 'tracker')} onClick={() => patch({ tab: 'tracker' })}>
              <Circle size={15} color={s.tab === 'tracker' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.6} />
              TRACKER
            </button>
            <button role="tab" aria-selected={s.tab === 'reports'} className={tabBtnClass(s.tab === 'reports')} onClick={() => patch({ tab: 'reports' })}>
              <BarChart3 size={15} color={s.tab === 'reports' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.8} />
              REPORTES
            </button>
            <button role="tab" aria-selected={s.tab === 'settings'} className={tabBtnClass(s.tab === 'settings')} onClick={() => patch({ tab: 'settings' })}>
              <Settings size={15} color={s.tab === 'settings' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.6} />
              CONFIG
            </button>
          </div>

          {/* Day progress: one segment per habit — orange done, red failed, grey pending. */}
          {s.tab === 'tracker' && stripHabits.length > 0 && (
            <div>
              <div
                className="flex gap-[3px]"
                role="progressbar"
                aria-label="Hábitos registrados hoy"
                aria-valuemin={0}
                aria-valuemax={stripHabits.length}
                aria-valuenow={stripAnswered}
              >
                {stripHabits.map((h) => {
                  const e = s.entries[h.id];
                  const color = !isAnswered(h, e) ? '#232323' : isOk(h, e) ? '#f7931a' : '#ff3333';
                  return <div key={h.id} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: color }} />;
                })}
              </div>
              <div className="flex justify-between text-[10px] tracking-wide text-[#8a8a8a] mt-1.5">
                <span>{stripAnswered}/{stripHabits.length} REGISTRADOS</span>
                {s.dayStarted && <span style={{ color: tierColor(todayRatio) }}>{Math.round(todayRatio * 100)}% COHERENCIA</span>}
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* TRACKER TAB */}
        {/* -------------------------------------------------------------- */}
        {s.tab === 'tracker' && (
          <div className="animate-tzs-rise">
            <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">
              AUDITORÍA // {todayLabel}
              {s.dayStarted && s.dayStartTime && (
                <span className="text-[#7d7d7d] normal-case tracking-normal"> — iniciado a las {s.dayStartTime}</span>
              )}
            </div>

            {!s.dayStarted ? (
              <div className="flex flex-col gap-3.5">
                <div className={cardClass}>
                  <div className={cardHeadClass}>ANTES DE EMPEZAR</div>
                  <div className={whyClass} style={{ marginBottom: 0 }}>
                    Responde cómo llegas al día — lo que pasó anoche y al despertar. Con eso se habilita el resto, que vas registrando a medida que ocurre.
                  </div>
                </div>
                {inicioHabits.map(renderHabit)}
                <div>
                  <button
                    disabled={!!startBlocker}
                    onClick={startDay}
                    className="w-full p-[18px] text-[15px] font-bold tracking-[2px] rounded-sm border-none transition-all"
                    style={bigBtnStyle(!startBlocker)}
                  >
                    INICIAR EL DÍA
                  </button>
                  {startBlocker && (
                    <div className="text-[11px] text-[#ff4d4d] mt-2.5" role="alert">⚠ {blockerText(startBlocker, 'INICIAR')}</div>
                  )}
                </div>
              </div>
            ) : (
            <>
            <div className="flex flex-col gap-3.5">
              {BLOQUES.map((b) => {
                const list = activeHabits.filter((h) => h.bloque === b.id);
                if (!list.length) return null;
                return (
                  <Fragment key={b.id}>
                    <div className={sectionLabelClass}>{b.label}</div>
                    {list.map(renderHabit)}
                  </Fragment>
                );
              })}
            </div>

            {/* Close day */}
            <div className="mt-7">
              <button
                disabled={!s.closed && !canClose}
                onClick={onCloseDay}
                className="w-full p-[18px] text-[15px] font-bold tracking-[2px] rounded-sm border-none transition-all"
                style={bigBtnStyle(canClose || s.closed)}
              >
                {s.closed ? 'INICIAR NUEVO DÍA' : 'CERRAR MI DÍA'}
              </button>
              {!canClose && !s.closed && (
                <div className="text-[11px] text-[#ff4d4d] mt-2.5" role="alert">⚠ {blockerText(closeBlocker, 'CONTINUAR')}</div>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* Summary modal */}
        {summaryVisible && s.summary && (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-5 z-[100] animate-tzs-fade-in"
            onClick={() => patch({ summaryDismissed: true })}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Resumen del día"
              className="bg-[#111111] border rounded-sm p-[26px] max-w-[400px] w-full max-h-[85vh] overflow-y-auto animate-tzs-modal-in"
              style={{ borderColor: s.summary.pct >= 70 ? '#3a2a12' : s.summary.pct < 50 ? '#3a1e1e' : '#2a2a2a' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-2.5">DÍA CERRADO A LAS {s.closedTime}</div>
              <div className="text-[44px] font-bold" style={{ color: tierColor(s.summary.pct / 100) }}>{s.summary.pct}%</div>
              <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-[18px]">DE TU OBJETIVO CUMPLIDO</div>
              {s.summary.improve.length > 0 && (
                <>
                  <div className="text-[11px] text-[#ff8080] tracking-wide mb-2">QUÉ DEBES MEJORAR</div>
                  <div className="flex flex-wrap gap-1.5 mb-[18px]">
                    {s.summary.improve.map((item) => (
                      <span key={item} className="text-[11px] text-[#ff8080] border border-[#3a1e1e] bg-[rgba(255,51,51,0.08)] px-2.5 py-1.5 rounded-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-1.5">POR QUÉ</div>
              <div className="text-[14px] text-[#e5e5e5] leading-[1.6] italic mb-4">"{s.summary.quote}"</div>
              <div className="text-[13px] text-[#c9c9c9] leading-[1.65] border-t border-[#232323] pt-4">{s.summary.callout}</div>
              <button
                autoFocus
                className="w-full mt-[18px] p-[14px] text-[12px] font-bold tracking-[1.5px] bg-[#f7931a] text-[#0a0a0a] border-none rounded-sm cursor-pointer"
                onClick={() => patch({ summaryDismissed: true })}
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* REPORTS TAB */}
        {/* -------------------------------------------------------------- */}
        {s.tab === 'reports' && (
          <div className="animate-tzs-rise">
            <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">ANALÍTICAS // TIEMPO Y SOBERANÍA</div>

            {s.dbLoading && (
              <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-3.5 animate-tzs-pulse" role="status">CARGANDO HISTORIAL DESDE SUPABASE…</div>
            )}
            {s.dbError && (
              <div className="bg-[#160707] border border-[#ff3333] text-[#ff8080] text-[11px] leading-[1.5] rounded-sm p-[14px_16px] mb-3.5 flex justify-between items-center gap-3">
                <span>NO SE PUDO CARGAR EL HISTORIAL: {s.dbError}</span>
                <button className="text-[#ff8080] border border-[#ff3333] rounded-sm px-2.5 py-1.5 text-[10px] font-bold tracking-wide cursor-pointer bg-transparent shrink-0" onClick={() => fetchHistory()}>
                  REINTENTAR
                </button>
              </div>
            )}

            <div className="bg-[#111111] border border-[#232323] rounded-sm p-[18px] mb-3.5 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mb-1.5">TU RANGO</div>
                <div className="text-[22px] font-bold" style={{ color: rankColor }}>{rank}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mb-1.5">PROMEDIO</div>
                <div className="text-[22px] font-bold text-[#e5e5e5]">{Math.round(yourAvg * 100)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div className="bg-[#111111] border border-[#1e3a2a] rounded-sm p-[18px]">
                <div className="text-[26px] font-bold text-[#f7931a]">{sovereigntyDays}</div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">DÍAS DE SOBERANÍA</div>
              </div>
              <div className="bg-[#111111] border border-[#3a1e1e] rounded-sm p-[18px]">
                <div className="text-[26px] font-bold text-[#ff3333]">{slaveryDays}</div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">DÍAS DE ESCLAVITUD</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#111111] border border-[#232323] rounded-sm p-[18px]">
                <div className="text-[26px] font-bold text-[#e5e5e5]">{streakDays}</div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">RACHA ACTUAL (DÍAS)</div>
              </div>
              <div className="bg-[#111111] border border-[#232323] rounded-sm p-[18px]">
                <div className="text-[26px] font-bold text-[#e5e5e5]">{bestStreak}</div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">MEJOR RACHA HISTÓRICA</div>
              </div>
            </div>

            {weakestCount > 0 && (
              <div className="bg-[#111111] border border-[#3a1e1e] rounded-sm p-[16px_18px] mb-6 flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-[#8a8a8a] tracking-wide mb-1">TU PILAR MÁS DÉBIL</div>
                  <div className="text-[16px] font-bold text-[#ff8080]">{weakestPillar}</div>
                </div>
                <div className="text-[11px] text-[#7d7d7d]">{weakestCount} FALLOS</div>
              </div>
            )}

            <div className="bg-[#111111] border border-[#3a2a12] rounded-sm p-5 mb-6">
              <div className="text-[11px] text-[#f7931a] tracking-wide mb-3.5">COMPARATIVA GLOBAL (ESTIMADA)</div>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                  <div className="text-[26px] font-bold text-[#f7931a]">TOP {beatsPct}%</div>
                  <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">SUPERAS AL {beatsPct}% MUNDIAL</div>
                </div>
                <div>
                  <div className="text-[26px] font-bold" style={{ color: deltaColor }}>{deltaLabel}</div>
                  <div className="text-[10px] text-[#8a8a8a] tracking-wide mt-1">VS PROMEDIO MUNDIAL</div>
                </div>
              </div>
              <div className="text-[12px] text-[#c9c9c9] leading-[1.5]">{globalLine}</div>
            </div>

            <div className="bg-[#111111] border border-[#232323] rounded-sm p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[11px] text-[#8a8a8a] tracking-wide">TENDENCIA DE SOBERANÍA</div>
              </div>
              <div className="flex gap-1.5 mb-4">
                <button className={viewBtnClass(s.reportView === 'daily')} onClick={() => patch({ reportView: 'daily', selectedPointIdx: null })}>DIARIO</button>
                <button className={viewBtnClass(s.reportView === 'weekly')} onClick={() => patch({ reportView: 'weekly', selectedPointIdx: null })}>SEMANAL</button>
                <button className={viewBtnClass(s.reportView === 'monthly')} onClick={() => patch({ reportView: 'monthly', selectedPointIdx: null })}>MENSUAL</button>
                <button className={viewBtnClass(s.reportView === 'annual')} onClick={() => patch({ reportView: 'annual', selectedPointIdx: null })}>ANUAL</button>
              </div>
              {n === 0 ? (
                <div className="text-[11px] text-[#8a8a8a] leading-[1.6] border border-dashed border-[#2a2a2a] rounded-sm p-5 text-center">
                  AÚN NO HAY DÍAS CERRADOS.<br />Cierra tu primer día para ver tu tendencia.
                </div>
              ) : (
              <div className="flex gap-2">
                <div className="relative w-7 h-[170px] shrink-0" aria-hidden="true">
                  {[['100%', 8], ['50%', 52], ['0%', 96]].map(([label, y]) => (
                    <span key={label} className="absolute right-0 text-[9px] text-[#6f6f6f] -translate-y-1/2" style={{ top: `${y}%` }}>{label}</span>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="relative h-[170px]">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                      <defs>
                        <linearGradient id="tzs-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f7931a" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#f7931a" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="8" x2="100" y2="8" stroke="#1c1c1c" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1="52" x2="100" y2="52" stroke="#1c1c1c" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1="96" x2="100" y2="96" stroke="#1c1c1c" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                      <line x1="0" y1={worldLineY} x2="100" y2={worldLineY} stroke="#f7931a" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" vectorEffect="non-scaling-stroke" />
                      {n > 1 && <path d={`${linePath} L${chartPoints[n - 1].x},96 L${chartPoints[0].x},96 Z`} fill="url(#tzs-area)" stroke="none" />}
                      <path d={linePath} fill="none" stroke="#f7931a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" opacity="0.85" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {/* Dots are HTML, not SVG: the SVG is stretched non-uniformly, which would turn circles into ellipses. */}
                    {chartPoints.map((p) => (
                      <button
                        key={p.idx}
                        type="button"
                        aria-label={`${p.label}: ${p.pct}%`}
                        className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        onMouseEnter={() => patch({ selectedPointIdx: p.idx })}
                        onFocus={() => patch({ selectedPointIdx: p.idx })}
                        onClick={() => patch({ selectedPointIdx: p.idx })}
                      >
                        <span
                          className="block rounded-full transition-all duration-150"
                          style={{ width: p.selected ? 11 : 7, height: p.selected ? 11 : 7, background: p.color, boxShadow: '0 0 0 2px #111111' }}
                        />
                      </button>
                    ))}
                    {selectedPoint && (
                      <div
                        className="absolute bg-[#0a0a0a] rounded-sm px-[9px] py-[5px] text-[12px] font-bold whitespace-nowrap z-10 border pointer-events-none"
                        style={{
                          left: `${selectedPoint.x}%`,
                          top: `${selectedPoint.y}%`,
                          transform: `translate(${selectedPoint.x < 18 ? '-12%' : selectedPoint.x > 82 ? '-88%' : '-50%'}, -150%)`,
                          borderColor: selectedPoint.color,
                          color: selectedPoint.color,
                        }}
                      >
                        {selectedPoint.label} — {selectedPoint.pct}%
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-[#7d7d7d]">{trendStartLabel}</span>
                    <span className="text-[9px] text-[#f7931a] opacity-70">— — MUNDIAL {worldPct}%</span>
                    <span className="text-[9px] text-[#7d7d7d]">{trendEndLabel}</span>
                  </div>
                </div>
              </div>
              )}
            </div>

            {pillarBreakdown.length > 0 && (
              <div className="bg-[#111111] border border-[#232323] rounded-sm p-5 mt-6">
                <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-3.5">CUMPLIMIENTO POR PILAR</div>
                <div className="flex flex-col gap-2.5">
                  {pillarBreakdown.map((pb) => (
                    <div key={pb.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-[#c9c9c9]">{pb.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: pb.color }}>{pb.pct}%</span>
                      </div>
                      <div className="bg-[#1c1c1c] rounded-sm h-1.5 w-full overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${pb.pct}%`, background: pb.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {s.dbHistory.length > 0 && (
              <HistoryList records={s.dbHistory} onSave={updateDay} onDelete={deleteDay} onDeleteAll={deleteAllDays} />
            )}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* SETTINGS TAB */}
        {/* -------------------------------------------------------------- */}
        {s.tab === 'settings' && (
          <SettingsTab
            habits={s.habits}
            syncError={s.habitsError}
            onSave={saveHabits}
            onError={(msg) => showToast(msg, 'red')}
          />
        )}
      </div>

      {/* Toast */}
      {s.toast && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => patch({ toast: null })}
          className={`fixed left-3 right-3 top-4 max-w-[436px] mx-auto text-[13px] font-semibold leading-[1.5] p-[14px_18px] rounded-sm z-50 border cursor-pointer ${
            s.toast.tone === 'red' ? 'animate-tzs-toast-in-red' : 'animate-tzs-toast-in-green'
          }`}
          style={{
            background: s.toast.tone === 'red' ? '#160707' : '#071510',
            borderColor: s.toast.tone === 'red' ? '#ff3333' : '#f7931a',
            color: s.toast.tone === 'red' ? '#ff8080' : '#f7931a',
          }}
        >
          {s.toast.message}
        </div>
      )}
    </div>
  );
}

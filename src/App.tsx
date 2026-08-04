import { useRef } from 'react';
import { Circle, BarChart3, Settings } from 'lucide-react';
import { useAppStore } from './store';
import type {
  AppState,
  DoneSkip,
  HistoryRecord,
  LookmaxState,
  PillarRecord,
  SummaryState,
  Tone,
} from './store';

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const sleepReasons = ['Estrés', 'Pantallas antes de dormir', 'Ruido o incomodidad', 'Cafeína o alcohol', 'Pensamientos acelerados'];
const gymReasons = ['Falta de tiempo', 'Cansancio', 'Pereza', 'Lesión o dolor', 'Prioricé otra cosa'];
const scrollReasons = ['Aburrimiento', 'Ansiedad', 'Notificación', 'Costumbre', 'Procrastinación'];
const nofapReasons = ['Aburrimiento', 'Estrés', 'Curiosidad', 'Costumbre', 'Ansiedad'];
const dietReasons = ['Antojo', 'Poca planificación', 'Evento social', 'Estrés', 'Pereza'];
const minoxReasons = ['Se me olvidó', 'Falta de tiempo', 'Pereza', 'No tenía a la mano'];
const workReasons = ['Distracciones', 'Reuniones excesivas', 'Procrastinación', 'Mala planificación', 'Cansancio'];
const proteinReasons = ['Se me olvidó', 'No tenía en casa', 'Pereza', 'Prioricé otra cosa'];
const prayReasons = ['Falta de tiempo', 'Se me olvidó', 'Distracción', 'Pereza'];

const whyNotes: Record<string, string> = {
  nofap: 'Preserva tu energía y tu foco mental.',
  diet: 'Tu cuerpo es la base de cualquier disciplina.',
  minox: 'Los resultados compuestos premian la constancia.',
  work: 'El tiempo respetado es libertad ganada.',
  sleep: 'Sin descanso real ninguna disciplina se sostiene.',
  gym: 'El cuerpo fuerte sostiene la mente fuerte.',
  scroll: 'Cada scroll sin propósito es atención robada.',
  lookmax: 'Los detalles son la diferencia entre bueno y memorable.',
  pray: 'La paz interior sostiene todas las demás métricas.',
  protein: 'La recuperación real ocurre con los nutrientes, no con la intención.',
};

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

function tierColor(v: number): string {
  return v >= 0.7 ? '#f7931a' : v < 0.5 ? '#ff3333' : '#8a8a8a';
}

// ---------------------------------------------------------------------------
// Tailwind class helpers
// ---------------------------------------------------------------------------

function btnClass(active: boolean, tone: Tone): string {
  const active2 = tone === 'red'
    ? 'bg-[rgba(255,51,51,0.12)] text-[#ff3333] border-[#ff3333]'
    : 'bg-[rgba(247,147,26,0.12)] text-[#f7931a] border-[#f7931a]';
  const inactive = 'bg-transparent text-[#8a8a8a] border-[#2a2a2a]';
  return `flex-1 text-xs font-semibold tracking-wide px-3.5 py-2.5 rounded-sm border cursor-pointer transition-colors ${active ? active2 : inactive}`;
}

function chipClass(active: boolean): string {
  return `text-[11px] font-semibold tracking-wide px-3 py-2 rounded-sm border cursor-pointer transition-colors ${
    active ? 'bg-[rgba(255,51,51,0.15)] text-[#ff6b6b] border-[#ff3333]' : 'bg-[#0d0d0d] text-[#a0a0a0] border-[#2a2a2a]'
  }`;
}

function viewBtnClass(active: boolean): string {
  return `flex-1 text-[10px] font-semibold tracking-wide px-2.5 py-[7px] rounded-sm border cursor-pointer transition-colors ${
    active ? 'bg-[rgba(247,147,26,0.14)] text-[#f7931a] border-[#f7931a]' : 'bg-transparent text-[#8a8a8a] border-[#2a2a2a]'
  }`;
}

function tabBtnClass(active: boolean): string {
  return `flex-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wider px-2 py-[9px] rounded-sm border-none cursor-pointer transition-colors ${
    active ? 'bg-[#141414] text-[#f7931a]' : 'bg-transparent text-[#8a8a8a]'
  }`;
}

const cardClass = 'bg-[#111111] border border-[#232323] rounded-sm p-[18px]';
const cardHeadClass = 'text-[11px] text-[#a0a0a0] tracking-wide mb-1.5 font-semibold';
const whyClass = 'text-[11px] text-[#6b6b6b] mb-3.5 leading-snug';
const inputClass = 'w-full box-border bg-[#0d0d0d] border border-[#2a2a2a] rounded-sm text-[#e5e5e5] text-[13px] px-3 py-2.5 outline-none focus:border-[#f7931a]';
const textareaClass = 'w-full box-border min-h-[60px] bg-[#0d0d0d] border border-[#5a2a2a] rounded-sm text-[#e5e5e5] text-[13px] px-3 py-2.5 outline-none resize-y focus:border-[#f7931a]';

// ---------------------------------------------------------------------------
// Reusable "reason" picker block (chips + optional free-text)
// ---------------------------------------------------------------------------

function ReasonPicker({
  visible,
  prompt,
  options,
  quicks,
  other,
  custom,
  onToggle,
  onToggleOther,
  onCustomChange,
  marginBottom = 14,
  placeholder = 'Redacta qué pasó',
}: {
  visible: boolean;
  prompt: string;
  options: string[];
  quicks: string[];
  other: boolean;
  custom: string;
  onToggle: (label: string) => void;
  onToggleOther: () => void;
  onCustomChange: (value: string) => void;
  marginBottom?: number;
  placeholder?: string;
}) {
  if (!visible) return null;
  return (
    <>
      <div className="text-[11px] text-[#ff8080] tracking-wide mb-2">{prompt}</div>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: other ? 8 : marginBottom }}>
        {options.map((label) => (
          <button key={label} className={chipClass(quicks.includes(label))} onClick={() => onToggle(label)}>
            {label}
          </button>
        ))}
        <button className={chipClass(other)} onClick={onToggleOther}>
          OTRO (ESCRIBIR)
        </button>
      </div>
      {other && (
        <textarea
          placeholder={placeholder}
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          className={textareaClass}
          style={{ marginBottom }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const state = useAppStore();
  const patch = state.patch;
  const toastTimeout = useRef<number | null>(null);
  const flashTimeout = useRef<number | null>(null);

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

  const toggleQuick = (field: keyof AppState, label: string) => {
    const list = state[field] as unknown as string[];
    patch({ [field]: list.includes(label) ? list.filter((x) => x !== label) : [...list, label] } as Partial<AppState>);
  };

  const finalizeReason = (quicks: string[], other: boolean, custom: string) =>
    [...quicks, ...(other && custom.trim() ? [custom.trim()] : [])].join(', ');

  const setLookmax = (key: keyof LookmaxState, val: DoneSkip) => {
    const nextLookmax = { ...state.lookmax, [key]: val };
    const wasComplete = state.lookmax.ice === 'done' && state.lookmax.jaw === 'done' && state.lookmax.eyes === 'done';
    const nowComplete = nextLookmax.ice === 'done' && nextLookmax.jaw === 'done' && nextLookmax.eyes === 'done';
    patch({ lookmax: nextLookmax });
    if (!wasComplete && nowComplete) showToast('Rutina de lookmax completa. Los detalles construyen la cara.', 'green');
  };

  const addHabit = () => {
    const name = state.newHabitName.trim();
    if (!name) return;
    const id = 'custom-' + Date.now();
    patch({ extraHabits: [...state.extraHabits, { id, name: name.toUpperCase(), status: null }], newHabitName: '' });
  };

  const startNewDay = () => {
    patch({
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
      closed: false, closedTime: '', summary: null, summaryDismissed: false, tab: 'tracker',
    });
    showToast('Nuevo día iniciado. Página en blanco, empieza a construir.', 'green');
  };

  // -------------------------------------------------------------------------
  // Derived values (recomputed every render — cheap enough for this app size)
  // -------------------------------------------------------------------------

  const s = state;

  const sleepIsNo = s.sleep === 'no';
  const gymIsNone = s.gym === 'none';
  const sleepFilled = s.sleepQuicks.length > 0 || (s.sleepOther && s.sleepCustom.trim().length > 0);
  const gymFilled = s.gymQuicks.length > 0 || (s.gymOther && s.gymCustom.trim().length > 0);
  const sleepBlocked = sleepIsNo && !sleepFilled;
  const gymBlocked = gymIsNone && !gymFilled;
  const answered = s.sleep !== null && s.gym !== null;
  const canClose = answered && !sleepBlocked && !gymBlocked && !s.closed;

  let blockReasonText = '';
  if (!answered) blockReasonText = 'RESPONDE DORMIR Y GYM PARA CONTINUAR.';
  else if (sleepBlocked) blockReasonText = 'FALTA EL VECTOR DE ATAQUE DEL SUEÑO.';
  else if (gymBlocked) blockReasonText = 'FALTA LA RAZÓN DE NO ENTRENAR.';

  const pillarMeta: PillarRecord[] = [
    { id: 'sleep', name: 'DORMIR', ok: s.sleep === 'yes' },
    { id: 'work', name: 'TRABAJO ÓPTIMO', ok: s.workDone === 'yes' },
    { id: 'gym', name: 'GYM', ok: s.gym === 'go' || s.gym === 'home' },
    { id: 'diet', name: 'DIETA', ok: s.diet === 'yes' },
    { id: 'protein', name: 'PROTEÍNA Y CREATINA', ok: s.protein === 'yes' },
    { id: 'minox', name: 'MINOXIDIL', ok: s.minox === 'yes' },
    { id: 'nofap', name: 'NO-FAP', ok: s.nofap === 'kept' },
    { id: 'scroll', name: 'REDES', ok: s.scroll === 'no' },
    { id: 'lookmax', name: 'LOOKMAX', ok: s.lookmax.ice === 'done' && s.lookmax.jaw === 'done' && s.lookmax.eyes === 'done' },
    { id: 'pray', name: 'ORAR', ok: s.pray === 'yes' },
  ];
  const todayRatio = pillarMeta.reduce((a, p) => a + (p.ok ? 1 : 0), 0) / pillarMeta.length;
  const failedPillars = pillarMeta.filter((p) => !p.ok);

  const last6 = s.history.slice(-6);
  const fullHistory = [...last6.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
  const sovereigntyDays = fullHistory.filter((v) => v >= 0.7).length;
  const slaveryDays = fullHistory.filter((v) => v < 0.5).length;
  let streakDays = 0;
  for (let i = fullHistory.length - 1; i >= 0; i--) {
    if (fullHistory[i] >= 0.7) streakDays++;
    else break;
  }

  const allTimeline = [...s.history.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
  let bestStreak = 0, run = 0;
  for (let i = 0; i < allTimeline.length; i++) {
    if (allTimeline[i] >= 0.7) { run++; bestStreak = Math.max(bestStreak, run); } else run = 0;
  }

  const failTally: Record<string, number> = {};
  s.history.forEach((r) => r.pillars.forEach((p) => { if (!p.ok) failTally[p.name] = (failTally[p.name] || 0) + 1; }));
  let weakestPillar = '—', weakestCount = 0;
  Object.keys(failTally).forEach((name) => { if (failTally[name] > weakestCount) { weakestCount = failTally[name]; weakestPillar = name; } });

  const pillarTotals: Record<string, { ok: number; total: number }> = {};
  s.history.forEach((r) => r.pillars.forEach((p) => {
    if (!pillarTotals[p.name]) pillarTotals[p.name] = { ok: 0, total: 0 };
    pillarTotals[p.name].total++;
    if (p.ok) pillarTotals[p.name].ok++;
  }));
  const pillarBreakdown = Object.keys(pillarTotals).map((name) => {
    const t = pillarTotals[name];
    const pct = t.total ? Math.round((t.ok / t.total) * 100) : 0;
    return { name, pct, color: pct >= 70 ? '#f7931a' : pct < 50 ? '#ff3333' : '#8a8a8a' };
  }).sort((a, b) => b.pct - a.pct);

  const dayList = [...s.history].slice(-14).reverse().map((r, idx) => {
    const failed = r.pillars.filter((p) => !p.ok).map((p) => p.name);
    const notes = [
      r.sleepReason ? { tag: 'DORMIR', text: r.sleepReason } : null,
      r.gymReason ? { tag: 'GYM', text: r.gymReason } : null,
      r.workNote ? { tag: 'TRABAJO', text: r.workNote } : null,
      r.workReason ? { tag: 'TRABAJO', text: r.workReason } : null,
      r.prayNotes ? { tag: 'ORAR', text: r.prayNotes } : null,
      r.prayReason ? { tag: 'ORAR', text: r.prayReason } : null,
      r.scrollReason ? { tag: 'REDES', text: r.scrollReason } : null,
      r.nofapReason ? { tag: 'NO-FAP', text: r.nofapReason } : null,
      r.dietReason ? { tag: 'DIETA', text: r.dietReason } : null,
      r.minoxReason ? { tag: 'MINOXIDIL', text: r.minoxReason } : null,
      r.proteinReason ? { tag: 'PROTEÍNA', text: r.proteinReason } : null,
    ].filter((n): n is { tag: string; text: string } => !!n);
    return {
      key: 'd' + idx,
      dateLabel: r.dateLabel,
      pctLabel: Math.round(r.ratio * 100) + '%',
      pctColor: r.ratio >= 0.7 ? '#f7931a' : r.ratio < 0.5 ? '#ff3333' : '#8a8a8a',
      failed, hasFailed: failed.length > 0, notes, hasNotes: notes.length > 0,
      notesGap: notes.length > 0 ? 6 : 0,
      expanded: s.expandedIdx === idx,
    };
  });

  const hasTodayActivity = !!(s.nofap || s.diet || s.minox || s.workDone || s.sleep || s.gym || s.scroll || s.pray ||
    s.lookmax.ice || s.lookmax.jaw || s.lookmax.eyes);
  const includeToday = !s.closed && hasTodayActivity;

  let rawSeries: { label: string; ratio: number }[] = [];
  if (s.reportView === 'daily') {
    const win = s.history.slice(-20);
    rawSeries = win.map((r) => ({ label: r.dateLabel, ratio: r.ratio }));
    if (includeToday) rawSeries.push({ label: 'HOY', ratio: todayRatio });
  } else {
    const groupBy = s.reportView;
    const withDate = s.history.map((r, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (s.history.length - i));
      return { ratio: r.ratio, dateObj: d };
    });
    if (includeToday) withDate.push({ ratio: todayRatio, dateObj: new Date() });
    const groups: Record<string, { sum: number; count: number; label: string; order: number }> = {};
    withDate.forEach((item) => {
      let key: string, label: string;
      if (groupBy === 'weekly') {
        const d = new Date(item.dateObj);
        const day = d.getDay();
        const sunday = new Date(d);
        sunday.setDate(d.getDate() - day);
        key = sunday.toISOString().slice(0, 10);
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

  const allRatios = [...s.history.map((r) => r.ratio), ...(s.closed ? [] : [todayRatio])];
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

  const onCloseDay = () => {
    if (s.closed) { startNewDay(); return; }
    if (!canClose) return;
    const now = new Date();
    const record: HistoryRecord = {
      ratio: todayRatio,
      dateLabel: now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      shortLabel: now.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 1).toUpperCase(),
      workDone: s.workDone,
      sleepReason: s.sleep === 'no' ? finalizeReason(s.sleepQuicks, s.sleepOther, s.sleepCustom) : '',
      gymReason: s.gym === 'none' ? finalizeReason(s.gymQuicks, s.gymOther, s.gymCustom) : '',
      workNote: s.workNote.trim(),
      workReason: s.workDone === 'no' ? finalizeReason(s.workQuicks, s.workOther, s.workCustom) : '',
      prayNotes: s.prayNotes.trim(),
      prayReason: s.pray === 'no' ? finalizeReason(s.prayQuicks, s.prayOther, s.prayCustom) : '',
      scrollReason: s.scroll === 'yes' ? finalizeReason(s.scrollQuicks, s.scrollOther, s.scrollCustom) : '',
      nofapReason: s.nofap === 'failed' ? finalizeReason(s.nofapQuicks, s.nofapOther, s.nofapCustom) : '',
      dietReason: s.diet === 'no' ? finalizeReason(s.dietQuicks, s.dietOther, s.dietCustom) : '',
      minoxReason: s.minox === 'no' ? finalizeReason(s.minoxQuicks, s.minoxOther, s.minoxCustom) : '',
      proteinReason: s.protein === 'no' ? finalizeReason(s.proteinQuicks, s.proteinOther, s.proteinCustom) : '',
      pillars: pillarMeta,
    };
    const quoteId = failedPillars.length ? failedPillars[0].id : 'perfect';
    const summary: SummaryState = {
      pct: Math.round(todayRatio * 100),
      improve: failedPillars.map((p) => p.name),
      quote: stoicQuotes[quoteId],
      callout: failedPillars.length
        ? calloutPool[Math.floor(Math.random() * calloutPool.length)]
        : successCallouts[Math.floor(Math.random() * successCallouts.length)],
    };
    patch({
      closed: true,
      closedTime: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      history: [...s.history, record],
      summary,
      summaryDismissed: false,
    });
    showToast('Día cerrado. La auditoría de hoy queda registrada.', 'green');
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen text-[#e5e5e5] transition-colors duration-200"
      style={{ background: s.flash ? '#2a0808' : '#0a0a0a' }}
    >
      <div className="max-w-[460px] mx-auto px-4 pb-[100px]">
        {/* Header */}
        <div
          className="flex flex-col gap-3.5 pt-[22px] pb-4 sticky top-0 z-[5] transition-colors duration-200"
          style={{ background: s.flash ? '#2a0808' : '#0a0a0a' }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[19px] font-bold text-[#f2f2f2] tracking-wide">THE SOVEREIGN OS</span>
            <span className="text-[19px] text-[#f7931a] animate-tzs-blink">_</span>
          </div>
          <div className="flex gap-1 border border-[#232323] rounded-sm p-1">
            <button className={tabBtnClass(s.tab === 'tracker')} onClick={() => patch({ tab: 'tracker' })}>
              <Circle size={15} color={s.tab === 'tracker' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.6} />
              TRACKER
            </button>
            <button className={tabBtnClass(s.tab === 'reports')} onClick={() => patch({ tab: 'reports' })}>
              <BarChart3 size={15} color={s.tab === 'reports' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.8} />
              REPORTES
            </button>
            <button className={tabBtnClass(s.tab === 'settings')} onClick={() => patch({ tab: 'settings' })}>
              <Settings size={15} color={s.tab === 'settings' ? '#f7931a' : '#8a8a8a'} strokeWidth={1.6} />
              CONFIG
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* TRACKER TAB */}
        {/* -------------------------------------------------------------- */}
        {s.tab === 'tracker' && (
          <>
            <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">AUDITORÍA // {todayLabel}</div>

            <div className="flex flex-col gap-3.5">
              {/* 01 DORMIR */}
              <div className={cardClass}>
                <div className={cardHeadClass}>01 // DORMIR — ¿DESCANSÉ REALMENTE BIEN?</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.sleep}</div>
                <div className="flex gap-2.5" style={{ marginBottom: sleepIsNo ? 14 : 0 }}>
                  <button
                    className={btnClass(s.sleep === 'yes', 'green')}
                    onClick={() => { patch({ sleep: 'yes', sleepQuicks: [], sleepCustom: '', sleepOther: false }); showToast('Descanso real. Hoy operas con ventaja.', 'green'); }}
                  >
                    DESCANSÉ BIEN
                  </button>
                  <button
                    className={btnClass(s.sleep === 'no', 'red')}
                    onClick={() => { patch({ sleep: 'no' }); triggerFlash(); showToast('Mal descanso. Encuentra el vector antes de que te corrija a ti.', 'red'); }}
                  >
                    DESCANSÉ MAL
                  </button>
                </div>
                <ReasonPicker
                  visible={sleepIsNo}
                  prompt="¿POR QUÉ FUE? (VECTOR DE ATAQUE)"
                  options={sleepReasons}
                  quicks={s.sleepQuicks}
                  other={s.sleepOther}
                  custom={s.sleepCustom}
                  onToggle={(label) => toggleQuick('sleepQuicks', label)}
                  onToggleOther={() => patch({ sleepOther: !s.sleepOther })}
                  onCustomChange={(v) => patch({ sleepCustom: v })}
                  marginBottom={0}
                  placeholder="Redacta el vector de ataque — obligatorio"
                />
              </div>

              {/* 02 TRABAJO */}
              <div className={cardClass}>
                <div className={cardHeadClass}>02 // TRABAJO ÓPTIMO — VENTANA 08:30–18:30</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.work}</div>
                <div className="flex gap-2.5 mb-3">
                  <button
                    className={btnClass(s.workDone === 'yes', 'green')}
                    onClick={() => { patch({ workDone: 'yes' }); showToast('Ventana respetada. Tu tiempo es tuyo otra vez.', 'green'); }}
                  >
                    CUMPLIDO
                  </button>
                  <button
                    className={btnClass(s.workDone === 'no', 'red')}
                    onClick={() => { patch({ workDone: 'no' }); triggerFlash(); showToast('El tiempo se te escapó. Audita mañana con más filo.', 'red'); }}
                  >
                    NO CUMPLIDO
                  </button>
                </div>
                <ReasonPicker
                  visible={s.workDone === 'no'}
                  prompt="¿QUÉ PASÓ?"
                  options={workReasons}
                  quicks={s.workQuicks}
                  other={s.workOther}
                  custom={s.workCustom}
                  onToggle={(label) => toggleQuick('workQuicks', label)}
                  onToggleOther={() => patch({ workOther: !s.workOther })}
                  onCustomChange={(v) => patch({ workCustom: v })}
                  marginBottom={12}
                />
                <input
                  type="text"
                  placeholder="Si terminaste antes, celébralo aquí"
                  value={s.workNote}
                  onChange={(e) => patch({ workNote: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* 03 GYM */}
              <div className={cardClass}>
                <div className={cardHeadClass}>03 // GYM</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.gym}</div>
                <div className="flex gap-2 flex-wrap" style={{ marginBottom: gymIsNone ? 14 : 0 }}>
                  <button
                    className={btnClass(s.gym === 'go', 'green')}
                    onClick={() => { patch({ gym: 'go', gymQuicks: [], gymCustom: '', gymOther: false }); showToast('Cuerpo entrenado, mente templada.', 'green'); }}
                  >
                    FUI AL GYM
                  </button>
                  <button
                    className={btnClass(s.gym === 'home', 'green')}
                    onClick={() => { patch({ gym: 'home', gymQuicks: [], gymCustom: '', gymOther: false }); showToast('Entrenaste donde estabas. Eso también es soberanía.', 'green'); }}
                  >
                    ENTRENÉ EN CASA
                  </button>
                  <button
                    className={btnClass(s.gym === 'none', 'red')}
                    onClick={() => { patch({ gym: 'none' }); triggerFlash(); showToast('Sin entrenamiento hoy. Que no se repita mañana.', 'red'); }}
                  >
                    NO ENTRENÉ
                  </button>
                </div>
                <ReasonPicker
                  visible={gymIsNone}
                  prompt="RAZÓN"
                  options={gymReasons}
                  quicks={s.gymQuicks}
                  other={s.gymOther}
                  custom={s.gymCustom}
                  onToggle={(label) => toggleQuick('gymQuicks', label)}
                  onToggleOther={() => patch({ gymOther: !s.gymOther })}
                  onCustomChange={(v) => patch({ gymCustom: v })}
                  marginBottom={0}
                  placeholder="Redacta la razón — obligatorio"
                />
              </div>

              {/* 04 DIETA */}
              <div className={cardClass}>
                <div className={cardHeadClass}>04 // DIETA — ¿COMÍ BIEN HOY?</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.diet}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.diet === 'no' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.diet === 'yes', 'green')}
                    onClick={() => { patch({ diet: 'yes', dietQuicks: [], dietCustom: '', dietOther: false }); showToast('Combustible limpio, mente clara.', 'green'); }}
                  >
                    COMÍ BIEN
                  </button>
                  <button
                    className={btnClass(s.diet === 'no', 'red')}
                    onClick={() => { patch({ diet: 'no' }); triggerFlash(); showToast('Comiste basura y lo sabes. Mañana no hay excusa.', 'red'); }}
                  >
                    COMÍ MAL
                  </button>
                </div>
                <ReasonPicker
                  visible={s.diet === 'no'}
                  prompt="¿QUÉ PASÓ?"
                  options={dietReasons}
                  quicks={s.dietQuicks}
                  other={s.dietOther}
                  custom={s.dietCustom}
                  onToggle={(label) => toggleQuick('dietQuicks', label)}
                  onToggleOther={() => patch({ dietOther: !s.dietOther })}
                  onCustomChange={(v) => patch({ dietCustom: v })}
                  marginBottom={0}
                />
              </div>

              {/* 05 PROTEÍNA */}
              <div className={cardClass}>
                <div className={cardHeadClass}>05 // PROTEÍNA Y CREATINA — ¿LAS TOMÉ HOY?</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.protein}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.protein === 'no' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.protein === 'yes', 'green')}
                    onClick={() => { patch({ protein: 'yes', proteinQuicks: [], proteinCustom: '', proteinOther: false }); showToast('Nutrición cubierta. Tu cuerpo puede recuperarse en serio.', 'green'); }}
                  >
                    SÍ LAS TOMÉ
                  </button>
                  <button
                    className={btnClass(s.protein === 'no', 'red')}
                    onClick={() => { patch({ protein: 'no' }); triggerFlash(); showToast('No tomaste lo que tu cuerpo necesitaba. Marca por qué.', 'red'); }}
                  >
                    NO LAS TOMÉ
                  </button>
                </div>
                <ReasonPicker
                  visible={s.protein === 'no'}
                  prompt="¿QUÉ PASÓ?"
                  options={proteinReasons}
                  quicks={s.proteinQuicks}
                  other={s.proteinOther}
                  custom={s.proteinCustom}
                  onToggle={(label) => toggleQuick('proteinQuicks', label)}
                  onToggleOther={() => patch({ proteinOther: !s.proteinOther })}
                  onCustomChange={(v) => patch({ proteinCustom: v })}
                  marginBottom={0}
                />
              </div>

              {/* 06 MINOXIDIL */}
              <div className={cardClass}>
                <div className={cardHeadClass}>06 // MINOXIDIL — ¿ME APLIQUÉ HOY?</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.minox}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.minox === 'no' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.minox === 'yes', 'green')}
                    onClick={() => { patch({ minox: 'yes' }); showToast('Constancia silenciosa. Así se construye el resultado.', 'green'); }}
                  >
                    ME APLIQUÉ
                  </button>
                  <button
                    className={btnClass(s.minox === 'no', 'red')}
                    onClick={() => { patch({ minox: 'no' }); triggerFlash(); showToast('Un día salteado es un día perdido en el espejo.', 'red'); }}
                  >
                    NO ME APLIQUÉ
                  </button>
                </div>
                <ReasonPicker
                  visible={s.minox === 'no'}
                  prompt="¿QUÉ PASÓ?"
                  options={minoxReasons}
                  quicks={s.minoxQuicks}
                  other={s.minoxOther}
                  custom={s.minoxCustom}
                  onToggle={(label) => toggleQuick('minoxQuicks', label)}
                  onToggleOther={() => patch({ minoxOther: !s.minoxOther })}
                  onCustomChange={(v) => patch({ minoxCustom: v })}
                  marginBottom={0}
                />
              </div>

              {/* 07 NO-FAP */}
              <div className={cardClass}>
                <div className={cardHeadClass}>07 // NO-FAP</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.nofap}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.nofap === 'failed' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.nofap === 'kept', 'green')}
                    onClick={() => { patch({ nofap: 'kept' }); showToast('Disciplina intacta. Sigues siendo dueño de tu energía.', 'green'); }}
                  >
                    MANTENIDO
                  </button>
                  <button
                    className={btnClass(s.nofap === 'failed', 'red')}
                    onClick={() => { patch({ nofap: 'failed' }); triggerFlash(); showToast('Cediste el control. Levántate de nuevo, hoy mismo.', 'red'); }}
                  >
                    FALLIDO
                  </button>
                </div>
                <ReasonPicker
                  visible={s.nofap === 'failed'}
                  prompt="¿QUÉ PASÓ?"
                  options={nofapReasons}
                  quicks={s.nofapQuicks}
                  other={s.nofapOther}
                  custom={s.nofapCustom}
                  onToggle={(label) => toggleQuick('nofapQuicks', label)}
                  onToggleOther={() => patch({ nofapOther: !s.nofapOther })}
                  onCustomChange={(v) => patch({ nofapCustom: v })}
                  marginBottom={0}
                />
              </div>

              {/* 08 REDES */}
              <div className={cardClass}>
                <div className={cardHeadClass}>08 // REDES — ¿SCROLLEASTE SIN PROPÓSITO?</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.scroll}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.scroll === 'yes' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.scroll === 'no', 'green')}
                    onClick={() => { patch({ scroll: 'no', scrollQuicks: [], scrollCustom: '', scrollOther: false }); showToast('Atención intacta. Nadie te robó tu foco hoy.', 'green'); }}
                  >
                    NO SCROLLEÉ
                  </button>
                  <button
                    className={btnClass(s.scroll === 'yes', 'red')}
                    onClick={() => { patch({ scroll: 'yes' }); triggerFlash(); showToast('Le regalaste tu atención a un algoritmo. Escribe por qué cediste.', 'red'); }}
                  >
                    SCROLLEÉ
                  </button>
                </div>
                <ReasonPicker
                  visible={s.scroll === 'yes'}
                  prompt="¿POR QUÉ CEDISTE?"
                  options={scrollReasons}
                  quicks={s.scrollQuicks}
                  other={s.scrollOther}
                  custom={s.scrollCustom}
                  onToggle={(label) => toggleQuick('scrollQuicks', label)}
                  onToggleOther={() => patch({ scrollOther: !s.scrollOther })}
                  onCustomChange={(v) => patch({ scrollCustom: v })}
                  marginBottom={0}
                  placeholder="Redacta por qué cediste"
                />
              </div>

              {/* 09 LOOKMAX */}
              <div className={cardClass}>
                <div className={cardHeadClass}>09 // LOOKMAX</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.lookmax}</div>
                <div className="flex flex-col gap-3">
                  {([
                    ['HIELO EN LOS OJOS', 'ice'],
                    ['EJERCICIO DE JAWLINE', 'jaw'],
                    ['EJERCICIO DE OJOS', 'eyes'],
                  ] as const).map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className="text-[13px] text-[#c9c9c9] tracking-wide">{label}</span>
                      <div className="flex gap-2">
                        <button className={btnClass(s.lookmax[key] === 'done', 'green')} onClick={() => setLookmax(key, 'done')}>HECHO</button>
                        <button className={btnClass(s.lookmax[key] === 'skip', 'red')} onClick={() => setLookmax(key, 'skip')}>NO LO HICE</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10 ORAR */}
              <div className={cardClass}>
                <div className={cardHeadClass}>10 // ORAR</div>
                <div className={whyClass}>POR QUÉ: {whyNotes.pray}</div>
                <div className="flex gap-2.5" style={{ marginBottom: s.pray === 'no' ? 14 : 0 }}>
                  <button
                    className={btnClass(s.pray === 'yes', 'green')}
                    onClick={() => { patch({ pray: 'yes' }); showToast('Gratitud registrada. La paz también es una métrica.', 'green'); }}
                  >
                    ORÉ
                  </button>
                  <button
                    className={btnClass(s.pray === 'no', 'red')}
                    onClick={() => { patch({ pray: 'no' }); showToast('Ni un minuto de quietud hoy. El ruido gana si no lo detienes.', 'red'); }}
                  >
                    NO ORÉ
                  </button>
                </div>
                <ReasonPicker
                  visible={s.pray === 'no'}
                  prompt="¿QUÉ PASÓ?"
                  options={prayReasons}
                  quicks={s.prayQuicks}
                  other={s.prayOther}
                  custom={s.prayCustom}
                  onToggle={(label) => toggleQuick('prayQuicks', label)}
                  onToggleOther={() => patch({ prayOther: !s.prayOther })}
                  onCustomChange={(v) => patch({ prayCustom: v })}
                  marginBottom={12}
                />
                <textarea
                  placeholder="Notas cortas (opcional)"
                  value={s.prayNotes}
                  onChange={(e) => patch({ prayNotes: e.target.value })}
                  className={textareaClass}
                  style={{ marginTop: 12 }}
                />
              </div>

              {/* EXTRA HABITS */}
              {s.extraHabits.length > 0 && (
                <>
                  <div className="text-[11px] text-[#6b6b6b] tracking-wide mt-1.5">HÁBITOS EXTRA</div>
                  {s.extraHabits.map((h) => (
                    <div
                      key={h.id}
                      className="bg-[#111111] rounded-sm p-[16px_18px] border"
                      style={{ borderColor: h.status === 'failed' ? '#3a1616' : '#232323' }}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2.5">
                        <span className="text-[13px] font-semibold text-[#e5e5e5]">{h.name}</span>
                        <div className="flex gap-2">
                          <button
                            className={btnClass(h.status === 'done', 'green')}
                            onClick={() => { patch({ extraHabits: s.extraHabits.map((x) => (x.id === h.id ? { ...x, status: 'done' } : x)) }); showToast('Registrado. Un punto más para la soberanía.', 'green'); }}
                          >
                            LOGRADO
                          </button>
                          <button
                            className={btnClass(h.status === 'failed', 'red')}
                            onClick={() => { patch({ extraHabits: s.extraHabits.map((x) => (x.id === h.id ? { ...x, status: 'failed' } : x)) }); triggerFlash(); showToast('Fallaste. No lo justifiques, corrígelo mañana.', 'red'); }}
                          >
                            FALLIDO
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Close day */}
            <div className="mt-7">
              <button
                disabled={!s.closed && !canClose}
                onClick={onCloseDay}
                className="w-full p-[18px] text-[15px] font-bold tracking-[2px] rounded-sm border-none transition-all"
                style={{
                  cursor: canClose || s.closed ? 'pointer' : 'not-allowed',
                  background: canClose || s.closed ? '#f7931a' : '#1a1a1a',
                  color: canClose || s.closed ? '#0a0a0a' : '#555',
                  boxShadow: canClose || s.closed ? '0 0 24px rgba(247,147,26,0.55)' : 'none',
                }}
              >
                {s.closed ? 'INICIAR NUEVO DÍA' : 'CERRAR MI DÍA'}
              </button>
              {!canClose && !s.closed && (
                <div className="text-[11px] text-[#ff4d4d] mt-2.5">⚠ {blockReasonText}</div>
              )}
            </div>
          </>
        )}

        {/* Summary modal */}
        {summaryVisible && s.summary && (
          <div
            className="fixed inset-0 bg-black/75 flex items-center justify-center p-5 z-[100]"
            onClick={() => patch({ summaryDismissed: true })}
          >
            <div
              className="bg-[#111111] border border-[#3a2a12] rounded-sm p-[26px] max-w-[400px] w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-2.5">DÍA CERRADO A LAS {s.closedTime}</div>
              <div className="text-[44px] font-bold text-[#f7931a]">{s.summary.pct}%</div>
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
                className="w-full mt-[18px] p-[13px] text-[12px] font-bold tracking-[1.5px] bg-[#f7931a] text-[#0a0a0a] border-none rounded-sm cursor-pointer"
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
          <>
            <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">ANALÍTICAS // TIEMPO Y SOBERANÍA</div>

            <div className="bg-[#111111] border border-[#232323] rounded-sm p-[18px] mb-3.5 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-[#8a8a8a] tracking-wide mb-1.5">TU RANGO</div>
                <div className="text-[22px] font-bold" style={{ color: rankColor }}>{rank}</div>
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
                <div className="text-[11px] text-[#6b6b6b]">{weakestCount} FALLOS</div>
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
              <div className="flex gap-2">
                <div className="flex flex-col justify-between h-[170px] pb-3.5">
                  <span className="text-[9px] text-[#5a5a5a]">100%</span>
                  <span className="text-[9px] text-[#5a5a5a]">50%</span>
                  <span className="text-[9px] text-[#5a5a5a]">0%</span>
                </div>
                <div className="flex-1 relative">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-[170px] block overflow-visible">
                    <line x1="0" y1="8" x2="100" y2="8" stroke="#1c1c1c" strokeWidth="0.5" />
                    <line x1="0" y1="52" x2="100" y2="52" stroke="#1c1c1c" strokeWidth="0.5" />
                    <line x1="0" y1="96" x2="100" y2="96" stroke="#1c1c1c" strokeWidth="0.5" />
                    <line x1="0" y1={worldLineY} x2="100" y2={worldLineY} stroke="#f7931a" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
                    <path d={linePath} fill="none" stroke="#f7931a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    {chartPoints.map((p) => (
                      <g key={p.idx}>
                        <circle
                          cx={p.x} cy={p.y} r={4} fill="transparent"
                          onMouseEnter={() => patch({ selectedPointIdx: p.idx })}
                          onClick={() => patch({ selectedPointIdx: p.idx })}
                          style={{ cursor: 'pointer' }}
                        />
                        <circle cx={p.x} cy={p.y} r={p.dotR} fill={p.color} stroke="#0a0a0a" strokeWidth="0.6" style={{ pointerEvents: 'none' }} />
                      </g>
                    ))}
                  </svg>
                  {selectedPoint && (
                    <div
                      className="absolute -translate-x-1/2 bg-[#0a0a0a] rounded-sm px-[9px] py-[5px] text-[12px] font-bold whitespace-nowrap z-10 border pointer-events-none"
                      style={{ left: `${selectedPoint.x}%`, top: `${(selectedPoint.y / 100) * 170}px`, transform: 'translate(-50%,-135%)', borderColor: selectedPoint.color, color: selectedPoint.color }}
                    >
                      {selectedPoint.label} — {selectedPoint.pct}%
                    </div>
                  )}
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] text-[#6b6b6b]">{trendStartLabel}</span>
                    <span className="text-[9px] text-[#f7931a] opacity-70">— — MUNDIAL {worldPct}%</span>
                    <span className="text-[9px] text-[#6b6b6b]">{trendEndLabel}</span>
                  </div>
                </div>
              </div>
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

            {dayList.length > 0 && (
              <div className="mt-6">
                <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-3">HISTORIAL DIARIO — TOCA UN DÍA PARA VER EL DETALLE</div>
                <div className="flex flex-col gap-2">
                  {dayList.map((d, idx) => {
                    return (
                      <div
                        key={d.key}
                        className="bg-[#111111] border border-[#232323] rounded-sm p-[14px_16px] cursor-pointer"
                        onClick={() => patch({ expandedIdx: s.expandedIdx === idx ? null : idx })}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-[#c9c9c9] tracking-wide">{d.dateLabel}</span>
                          <span className="text-[13px] font-bold" style={{ color: d.pctColor }}>{d.pctLabel}</span>
                        </div>
                        {d.expanded && (
                          <div className="mt-3 border-t border-[#232323] pt-3">
                            {d.hasFailed && (
                              <>
                                <div className="text-[10px] text-[#ff8080] tracking-wide mb-1.5">FALLASTE EN</div>
                                <div className="flex flex-wrap gap-1.5" style={{ marginBottom: d.notesGap }}>
                                  {d.failed.map((name) => (
                                    <span key={name} className="text-[11px] text-[#ff8080] border border-[#3a1e1e] bg-[rgba(255,51,51,0.08)] px-[9px] py-[5px] rounded-sm">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                            {d.hasNotes && d.notes.map((n, i) => (
                              <div key={i} className="text-[12px] text-[#c9c9c9] leading-[1.5] mt-1">
                                <span className="text-[#ff8a4d]">[{n.tag}]</span> {n.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* -------------------------------------------------------------- */}
        {/* SETTINGS TAB */}
        {/* -------------------------------------------------------------- */}
        {s.tab === 'settings' && (
          <>
            <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">GESTOR // HÁBITOS EXTRA</div>
            <div className="bg-[#111111] border border-[#232323] rounded-sm p-5">
              <div className="text-[12px] text-[#c9c9c9] mb-3">NUEVO HÁBITO</div>
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="Nombre del hábito (ej. Leer 20 min)"
                  value={s.newHabitName}
                  onChange={(e) => patch({ newHabitName: e.target.value })}
                  className={inputClass}
                />
                <button
                  className="w-full text-[12px] font-bold tracking-wide p-[11px_14px] bg-[#f7931a] text-[#0a0a0a] border-none rounded-sm cursor-pointer"
                  onClick={addHabit}
                >
                  AGREGAR
                </button>
              </div>
            </div>
            <div className="mt-[18px]">
              <div className="text-[11px] text-[#6b6b6b] tracking-wide mb-2.5">HÁBITOS EXTRA ACTIVOS ({s.extraHabits.length})</div>
              <div className="flex flex-col gap-2">
                {s.extraHabits.map((h) => (
                  <div key={h.id} className="text-[13px] text-[#c9c9c9] bg-[#111111] border border-[#232323] rounded-sm px-4 py-3">
                    {h.name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {s.toast && (
        <div
          className={`fixed left-3 right-3 top-4 max-w-[436px] mx-auto text-[13px] font-semibold leading-[1.5] p-[18px_20px] rounded-sm z-50 border ${
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

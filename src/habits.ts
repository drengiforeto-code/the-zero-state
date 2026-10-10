// ---------------------------------------------------------------------------
// Habit model — habits are data, not code. Every card in the tracker is
// rendered from a HabitDef, and the settings tab edits these definitions.
// ---------------------------------------------------------------------------

// Order in which blocks appear during the day. 'inicio' habits are answered
// before "INICIAR EL DÍA" (they're about last night / waking up) and must all
// be answered before the day can start.
export type Bloque = 'inicio' | 'manana' | 'dia' | 'noche';

export const BLOQUES: { id: Bloque; label: string; hint: string }[] = [
  { id: 'inicio', label: 'Anoche y al despertar', hint: 'Obligatorio para iniciar el día' },
  { id: 'manana', label: 'Mañana', hint: 'Rutina al empezar' },
  { id: 'dia', label: 'Durante el día', hint: 'Se registra cuando ocurre' },
  { id: 'noche', label: 'Noche', hint: 'Antes de cerrar el día' },
];

export interface HabitOption {
  id: string;
  label: string;
  // Whether choosing this option counts the habit as fulfilled.
  ok: boolean;
  // Optional custom toast shown when this option is picked.
  mensaje?: string;
}

export interface HabitDef {
  id: string;
  nombre: string;
  pregunta: string;
  porQue: string;
  bloque: Bloque;
  orden: number;
  activo: boolean;
  // Answer mode: when `subtareas` is non-empty the habit is a checklist
  // (fulfilled only if every subtask is done) and `opciones` is ignored.
  opciones: HabitOption[];
  subtareas: string[];
  razones: string[];
  // Failing without a reason blocks closing the day, and the habit must be
  // answered at all before closing.
  razonObligatoria: boolean;
  conNota: boolean;
}

export type SubStatus = 'done' | 'skip';

export interface HabitEntry {
  opcion: string | null;
  subtareas: Record<string, SubStatus>;
  razones: string[];
  otro: boolean;
  custom: string;
  nota: string;
}

export const emptyEntry = (): HabitEntry => ({ opcion: null, subtareas: {}, razones: [], otro: false, custom: '', nota: '' });

export const isChecklist = (h: HabitDef) => h.subtareas.length > 0;

export function isAnswered(h: HabitDef, e: HabitEntry | undefined): boolean {
  if (!e) return false;
  if (isChecklist(h)) return h.subtareas.every((t) => e.subtareas[t]);
  return e.opcion !== null;
}

export function isOk(h: HabitDef, e: HabitEntry | undefined): boolean {
  if (!e) return false;
  if (isChecklist(h)) return h.subtareas.every((t) => e.subtareas[t] === 'done');
  return !!h.opciones.find((o) => o.id === e.opcion)?.ok;
}

// True once the user picked a failing answer (or skipped any subtask).
export function isFailed(h: HabitDef, e: HabitEntry | undefined): boolean {
  if (!e) return false;
  if (isChecklist(h)) return h.subtareas.some((t) => e.subtareas[t] === 'skip');
  return e.opcion !== null && !isOk(h, e);
}

export function reasonText(e: HabitEntry | undefined): string {
  if (!e) return '';
  return [...e.razones, ...(e.otro && e.custom.trim() ? [e.custom.trim()] : [])].join(', ');
}

// A habit blocks progress when it's required but unanswered, or failed
// without the mandatory reason.
export function isBlocking(h: HabitDef, e: HabitEntry | undefined): boolean {
  if (!h.razonObligatoria) return false;
  if (!isAnswered(h, e)) return true;
  return isFailed(h, e) && !reasonText(e);
}

export const newHabitId = () => 'h-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const yesNo = (si: string, no: string, siMsg: string, noMsg: string): HabitOption[] => [
  { id: 'yes', label: si, ok: true, mensaje: siMsg },
  { id: 'no', label: no, ok: false, mensaje: noMsg },
];

// Ids and names match the pillars stored in dias_cerrados before habits
// became configurable, so historical reports line up with the new ones.
export const DEFAULT_HABITS: HabitDef[] = [
  {
    id: 'sleep', nombre: 'DORMIR', pregunta: '¿DESCANSÉ REALMENTE BIEN?', porQue: 'Sin descanso real ninguna disciplina se sostiene.',
    bloque: 'inicio', orden: 0, activo: true,
    opciones: yesNo('DESCANSÉ BIEN', 'DESCANSÉ MAL', 'Descanso real. Hoy operas con ventaja.', 'Mal descanso. Encuentra el vector antes de que te corrija a ti.'),
    subtareas: [], razones: ['Estrés', 'Pantallas antes de dormir', 'Ruido o incomodidad', 'Cafeína o alcohol', 'Pensamientos acelerados'],
    razonObligatoria: true, conNota: false,
  },
  {
    id: 'pray', nombre: 'ORAR', pregunta: '', porQue: 'La paz interior sostiene todas las demás métricas.',
    bloque: 'inicio', orden: 1, activo: true,
    opciones: yesNo('ORÉ', 'NO ORÉ', 'Gratitud registrada. La paz también es una métrica.', 'Ni un minuto de quietud hoy. El ruido gana si no lo detienes.'),
    subtareas: [], razones: ['Falta de tiempo', 'Se me olvidó', 'Distracción', 'Pereza'],
    razonObligatoria: false, conNota: true,
  },
  {
    id: 'lookmax', nombre: 'LOOKMAX', pregunta: '', porQue: 'Los detalles son la diferencia entre bueno y memorable.',
    bloque: 'inicio', orden: 2, activo: true,
    opciones: [], subtareas: ['HIELO EN LOS OJOS', 'EJERCICIO DE JAWLINE', 'EJERCICIO DE OJOS'], razones: [],
    razonObligatoria: false, conNota: false,
  },
  {
    id: 'work', nombre: 'TRABAJO ÓPTIMO', pregunta: 'VENTANA 08:30–18:30', porQue: 'El tiempo respetado es libertad ganada.',
    bloque: 'dia', orden: 3, activo: true,
    opciones: [
      { id: 'yes', label: 'CUMPLIDO', ok: true, mensaje: 'Ventana respetada. Tu tiempo es tuyo otra vez.' },
      { id: 'no', label: 'NO CUMPLIDO', ok: false, mensaje: 'El tiempo se te escapó. Audita mañana con más filo.' },
    ],
    subtareas: [], razones: ['Distracciones', 'Reuniones excesivas', 'Procrastinación', 'Mala planificación', 'Cansancio'],
    razonObligatoria: false, conNota: true,
  },
  {
    id: 'gym', nombre: 'GYM', pregunta: '', porQue: 'El cuerpo fuerte sostiene la mente fuerte.',
    bloque: 'dia', orden: 4, activo: true,
    opciones: [
      { id: 'go', label: 'FUI AL GYM', ok: true, mensaje: 'Cuerpo entrenado, mente templada.' },
      { id: 'home', label: 'ENTRENÉ EN CASA', ok: true, mensaje: 'Entrenaste donde estabas. Eso también es soberanía.' },
      { id: 'none', label: 'NO ENTRENÉ', ok: false, mensaje: 'Sin entrenamiento hoy. Que no se repita mañana.' },
    ],
    subtareas: [], razones: ['Falta de tiempo', 'Cansancio', 'Pereza', 'Lesión o dolor', 'Prioricé otra cosa'],
    razonObligatoria: true, conNota: false,
  },
  {
    id: 'diet', nombre: 'DIETA', pregunta: '¿COMÍ BIEN HOY?', porQue: 'Tu cuerpo es la base de cualquier disciplina.',
    bloque: 'dia', orden: 5, activo: true,
    opciones: yesNo('COMÍ BIEN', 'COMÍ MAL', 'Combustible limpio, mente clara.', 'Comiste basura y lo sabes. Mañana no hay excusa.'),
    subtareas: [], razones: ['Antojo', 'Poca planificación', 'Evento social', 'Estrés', 'Pereza'],
    razonObligatoria: false, conNota: false,
  },
  {
    id: 'protein', nombre: 'PROTEÍNA Y CREATINA', pregunta: '¿LAS TOMÉ HOY?', porQue: 'La recuperación real ocurre con los nutrientes, no con la intención.',
    bloque: 'dia', orden: 6, activo: true,
    opciones: yesNo('SÍ LAS TOMÉ', 'NO LAS TOMÉ', 'Nutrición cubierta. Tu cuerpo puede recuperarse en serio.', 'No tomaste lo que tu cuerpo necesitaba. Marca por qué.'),
    subtareas: [], razones: ['Se me olvidó', 'No tenía en casa', 'Pereza', 'Prioricé otra cosa'],
    razonObligatoria: false, conNota: false,
  },
  {
    id: 'minox', nombre: 'MINOXIDIL', pregunta: '¿ME APLIQUÉ HOY?', porQue: 'Los resultados compuestos premian la constancia.',
    bloque: 'inicio', orden: 7, activo: true,
    opciones: yesNo('ME APLIQUÉ', 'NO ME APLIQUÉ', 'Constancia silenciosa. Así se construye el resultado.', 'Un día salteado es un día perdido en el espejo.'),
    subtareas: [], razones: ['Se me olvidó', 'Falta de tiempo', 'Pereza', 'No tenía a la mano'],
    razonObligatoria: false, conNota: false,
  },
  {
    id: 'nofap', nombre: 'NO-FAP', pregunta: '', porQue: 'Preserva tu energía y tu foco mental.',
    bloque: 'inicio', orden: 8, activo: true,
    opciones: [
      { id: 'kept', label: 'MANTENIDO', ok: true, mensaje: 'Disciplina intacta. Sigues siendo dueño de tu energía.' },
      { id: 'failed', label: 'FALLIDO', ok: false, mensaje: 'Cediste el control. Levántate de nuevo, hoy mismo.' },
    ],
    subtareas: [], razones: ['Aburrimiento', 'Estrés', 'Curiosidad', 'Costumbre', 'Ansiedad'],
    razonObligatoria: false, conNota: false,
  },
  {
    id: 'scroll', nombre: 'REDES', pregunta: '¿SCROLLEASTE SIN PROPÓSITO?', porQue: 'Cada scroll sin propósito es atención robada.',
    bloque: 'inicio', orden: 9, activo: true,
    opciones: [
      { id: 'no', label: 'NO SCROLLEÉ', ok: true, mensaje: 'Atención intacta. Nadie te robó tu foco hoy.' },
      { id: 'yes', label: 'SCROLLEÉ', ok: false, mensaje: 'Le regalaste tu atención a un algoritmo. Escribe por qué cediste.' },
    ],
    subtareas: [], razones: ['Aburrimiento', 'Ansiedad', 'Notificación', 'Costumbre', 'Procrastinación'],
    razonObligatoria: false, conNota: false,
  },
];

// ---------------------------------------------------------------------------
// One-off migration: these habits describe last night, so they now belong to
// the start-of-day block. Only habits still sitting in their old default block
// are moved — anything the user already relocated by hand is left alone.
// ---------------------------------------------------------------------------

const MOVED_TO_INICIO: Record<string, Bloque> = {
  lookmax: 'manana',
  minox: 'dia',
  nofap: 'noche',
  scroll: 'noche',
};

export function moveNightHabitsToInicio(habits: HabitDef[]): { habits: HabitDef[]; changed: HabitDef[] } {
  const changed: HabitDef[] = [];
  const next = habits.map((h) => {
    if (MOVED_TO_INICIO[h.id] !== h.bloque) return h;
    const moved = { ...h, bloque: 'inicio' as Bloque };
    changed.push(moved);
    return moved;
  });
  return { habits: next, changed };
}

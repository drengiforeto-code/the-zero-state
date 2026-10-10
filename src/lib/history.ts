import type { HabitEntry } from '../habits';
import type { HistoryRecord, PillarRecord } from '../store';

// ---------------------------------------------------------------------------
// Supabase row (dias_cerrados) <-> HistoryRecord mapping
// ---------------------------------------------------------------------------

export interface DiaCerradoDetalle {
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

export interface DiaCerradoRow {
  id: string;
  fecha: string;
  score_coherencia: number;
  detalle: DiaCerradoDetalle;
  created_at: string;
}

export function dbRowToHistoryRecord(row: DiaCerradoRow): HistoryRecord {
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

// Local calendar date as 'YYYY-MM-DD'. NOT toISOString().slice(0,10) — that
// converts to UTC first, so the day rolls over at UTC midnight rather than
// the user's actual local midnight (hours off in most timezones).
export function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

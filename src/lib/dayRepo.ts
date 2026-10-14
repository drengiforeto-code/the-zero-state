import { supabase, supabaseConfigError } from './supabase';
import type { HabitEntry } from '../habits';

// The day in progress is mirrored to the single-row `dia_actual` table so it
// survives a cleared browser and can be continued from another device. The
// local copy (zustand/localStorage) stays the working copy; `ts` (ms) decides
// which side is newer.

export interface DayDraft {
  entries: Record<string, HabitEntry>;
  dayStarted: boolean;
  dayStartTime: string;
  dayDate: string;
  closed: boolean;
  closedTime: string;
  closedDate: string;
  ts: number;
}

const ROW_ID = 'actual';

export async function fetchDay(): Promise<{ draft: DayDraft | null; error: string | null }> {
  if (!supabase) return { draft: null, error: supabaseConfigError };
  const { data, error } = await supabase.from('dia_actual').select('estado').eq('id', ROW_ID).maybeSingle();
  if (error) return { draft: null, error: error.message };
  return { draft: (data?.estado as DayDraft | undefined) ?? null, error: null };
}

export async function saveDay(draft: DayDraft): Promise<string | null> {
  if (!supabase) return supabaseConfigError;
  // A blocked write (missing RLS policy) comes back as success with 0 rows.
  const { data, error } = await supabase.from('dia_actual').upsert({ id: ROW_ID, estado: draft }, { onConflict: 'id' }).select('id');
  if (error) return error.message;
  return data?.length ? null : 'Supabase bloqueó la escritura (faltan los permisos de dia_actual).';
}

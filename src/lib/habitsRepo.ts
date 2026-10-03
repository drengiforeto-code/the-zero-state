import { supabase, supabaseConfigError } from './supabase';
import type { HabitDef } from '../habits';

// Habit definitions live in the `habitos` table so phone and desktop share the
// same configuration. `orden`/`activo` are real columns (cheap to query); the
// rest of the definition is stored as-is in `config`.

interface HabitoRow {
  id: string;
  orden: number;
  activo: boolean;
  config: Omit<HabitDef, 'id' | 'orden' | 'activo'>;
}

const toRow = ({ id, orden, activo, ...config }: HabitDef): HabitoRow => ({ id, orden, activo, config });
const fromRow = (r: HabitoRow): HabitDef => ({ ...r.config, id: r.id, orden: r.orden, activo: r.activo });

export async function fetchHabits(): Promise<{ habits: HabitDef[] | null; error: string | null }> {
  if (!supabase) return { habits: null, error: supabaseConfigError };
  const { data, error } = await supabase.from('habitos').select('id, orden, activo, config').order('orden');
  if (error) return { habits: null, error: error.message };
  return { habits: (data as HabitoRow[]).map(fromRow), error: null };
}

export async function upsertHabits(habits: HabitDef[]): Promise<string | null> {
  if (!supabase) return supabaseConfigError;
  const { error } = await supabase.from('habitos').upsert(habits.map(toRow), { onConflict: 'id' });
  return error ? error.message : null;
}

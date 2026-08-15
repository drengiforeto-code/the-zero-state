import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A missing env var must never crash the whole app at module-load time —
// that takes down the entire UI (tracker included) with a blank screen
// before React even mounts. Callers check `supabaseConfigError` and degrade
// gracefully (error banner / toast) instead.
export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? 'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Configúralas en las variables de entorno del deploy.'
    : null;

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);

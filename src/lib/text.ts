// Habit names, questions and answer labels are stored in UPPERCASE (that's how
// they're saved in Supabase and how history refers to them). The UI shows them
// in sentence case; stored values are never changed.
export function sentence(s: string): string {
  return s.toLocaleLowerCase('es').replace(/\p{L}/u, (c) => c.toLocaleUpperCase('es'));
}

import { BedDouble, BookOpen, Briefcase, Droplets, Dumbbell, FlaskConical, Gem, HandHeart, Moon, PenLine, Salad, ShieldCheck, Smartphone, Sun, Sunrise, Target, Wallet, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Bloque, HabitDef } from './habits';

// One icon family (lucide, same stroke) for everything that identifies a
// block or a habit. Known default habits first, then keywords in the name so
// habits created in settings get a fitting icon, then a neutral target.
export const BLOCK_ICON: Record<Bloque, LucideIcon> = { inicio: Sunrise, manana: Sun, dia: Zap, noche: Moon };

const BY_ID: Record<string, LucideIcon> = {
  sleep: BedDouble, pray: HandHeart, lookmax: Gem, work: Briefcase, gym: Dumbbell,
  diet: Salad, protein: FlaskConical, minox: Droplets, nofap: ShieldCheck, scroll: Smartphone,
};
const BY_KEYWORD: [RegExp, LucideIcon][] = [
  [/dorm|sue[ñn]o|descans/i, BedDouble], [/or[aáó]|medit|rez|gratitud/i, HandHeart], [/gym|entren|ejerc|pesas|correr|cardio/i, Dumbbell],
  [/com[ií]|dieta|nutri|ayuno|agua/i, Salad], [/prote|creatina|suplem|vitamin/i, FlaskConical], [/leer|lectura|libro|estud/i, BookOpen],
  [/trabaj|foco|product|deep/i, Briefcase], [/red|scroll|celu|pantalla|tiktok|insta/i, Smartphone], [/fap|porn|abstin/i, ShieldCheck],
  [/ducha|aseo|piel|skin|cara|look/i, Gem], [/diario|journal|escrib/i, PenLine], [/ahorr|dinero|gasto|invers/i, Wallet],
];
export function habitIcon(h: Pick<HabitDef, 'id' | 'nombre'>): LucideIcon {
  return BY_ID[h.id] ?? BY_KEYWORD.find(([re]) => re.test(h.nombre))?.[1] ?? Target;
}

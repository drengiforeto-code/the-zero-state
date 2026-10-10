import type { Tone } from './store';

// ---------------------------------------------------------------------------
// Class helpers. The styles themselves live in index.css (@layer components);
// these just pick the right variant so components share one visual system.
// ---------------------------------------------------------------------------

// Colour for a 0–1 coherence ratio: green = sovereign (≥70%), red = slavery
// (<50%), grey = in between.
export const GOOD = '#34d399';
export const BAD = '#f43f5e';
export const MID = '#fbbf24';
export function tierColor(v: number): string {
  return v >= 0.7 ? GOOD : v < 0.5 ? BAD : MID;
}
// Ring gradient (start → end) for the same tiers.
export function tierGradient(v: number): [string, string] {
  return v >= 0.7 ? ['#10b981', '#a3e635'] : v < 0.5 ? ['#f43f5e', '#fb923c'] : ['#f59e0b', '#fde047'];
}

// Answer button; `tone` says whether the option counts as fulfilled ('green') or failed ('red').
export function choiceClass(active: boolean, tone: Tone, size: 'md' | 'sm' = 'md'): string {
  return ['choice', size === 'sm' && 'choice-sm', active ? (tone === 'red' ? 'choice-bad' : 'choice-ok') : tone === 'red' ? 'choice-idle-bad' : 'choice-idle-ok'].filter(Boolean).join(' ');
}

export const chipClass = (active: boolean) => `chip${active ? ' chip-on' : ''}`;
export const segClass = (active: boolean) => `seg-item${active ? ' seg-item-on' : ''}`;
export const tabClass = (active: boolean) => `tab${active ? ' tab-on' : ''}`;

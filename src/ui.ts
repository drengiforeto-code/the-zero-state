import type { Tone } from './store';

// ---------------------------------------------------------------------------
// Class helpers. The styles themselves live in index.css (@layer components);
// these just pick the right variant so components share one visual system.
// ---------------------------------------------------------------------------

// Colour for a 0–1 coherence ratio: green = sovereign (≥70%), red = slavery
// (<50%), grey = in between.
export const GOOD = '#22c55e';
export const BAD = '#ef4444';
export const MID = '#8a8a8a';
export function tierColor(v: number): string {
  return v >= 0.7 ? GOOD : v < 0.5 ? BAD : MID;
}

// Answer button; `tone` says whether the option counts as fulfilled ('green') or failed ('red').
export function choiceClass(active: boolean, tone: Tone, size: 'md' | 'sm' = 'md'): string {
  return ['choice', size === 'sm' && 'choice-sm', active && (tone === 'red' ? 'choice-bad' : 'choice-ok')].filter(Boolean).join(' ');
}

export const chipClass = (active: boolean) => `chip${active ? ' chip-on' : ''}`;
export const segClass = (active: boolean) => `seg-item${active ? ' seg-item-on' : ''}`;
export const tabClass = (active: boolean) => `tab${active ? ' tab-on' : ''}`;

import type { Tone } from './store';

// ---------------------------------------------------------------------------
// Tailwind class helpers shared across tabs
// ---------------------------------------------------------------------------

export function btnClass(active: boolean, tone: Tone): string {
  const active2 = tone === 'red'
    ? 'bg-[rgba(255,51,51,0.12)] text-[#ff3333] border-[#ff3333]'
    : 'bg-[rgba(247,147,26,0.12)] text-[#f7931a] border-[#f7931a]';
  const inactive = 'bg-transparent text-[#8a8a8a] border-[#2a2a2a]';
  return `flex-1 text-xs font-semibold tracking-wide px-3.5 py-2.5 rounded-sm border cursor-pointer transition-colors ${active ? active2 : inactive}`;
}

export function chipClass(active: boolean): string {
  return `text-[11px] font-semibold tracking-wide px-3 py-2 rounded-sm border cursor-pointer transition-colors ${
    active ? 'bg-[rgba(255,51,51,0.15)] text-[#ff6b6b] border-[#ff3333]' : 'bg-[#0d0d0d] text-[#a0a0a0] border-[#2a2a2a]'
  }`;
}

export function viewBtnClass(active: boolean): string {
  return `flex-1 text-[10px] font-semibold tracking-wide px-2.5 py-[7px] rounded-sm border cursor-pointer transition-colors ${
    active ? 'bg-[rgba(247,147,26,0.14)] text-[#f7931a] border-[#f7931a]' : 'bg-transparent text-[#8a8a8a] border-[#2a2a2a]'
  }`;
}

export function tabBtnClass(active: boolean): string {
  return `flex-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wider px-2 py-[9px] rounded-sm border-none cursor-pointer transition-colors ${
    active ? 'bg-[#141414] text-[#f7931a]' : 'bg-transparent text-[#8a8a8a]'
  }`;
}

export const cardClass = 'bg-[#111111] border border-[#232323] rounded-sm p-[18px]';
export const cardHeadClass = 'text-[11px] text-[#a0a0a0] tracking-wide mb-1.5 font-semibold';
export const whyClass = 'text-[11px] text-[#6b6b6b] mb-3.5 leading-snug';
export const sectionLabelClass = 'text-[11px] text-[#6b6b6b] tracking-wide mt-1.5';
export const inputClass = 'w-full box-border bg-[#0d0d0d] border border-[#2a2a2a] rounded-sm text-[#e5e5e5] text-[13px] px-3 py-2.5 outline-none focus:border-[#f7931a]';
export const textareaClass = 'w-full box-border min-h-[60px] bg-[#0d0d0d] border border-[#5a2a2a] rounded-sm text-[#e5e5e5] text-[13px] px-3 py-2.5 outline-none resize-y focus:border-[#f7931a]';
export const smallBtnClass = 'text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-sm border cursor-pointer bg-transparent';
export const primaryBtnClass = 'w-full text-[12px] font-bold tracking-wide p-[11px_14px] bg-[#f7931a] text-[#0a0a0a] border-none rounded-sm cursor-pointer';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SummaryState } from '../store';
import { sentence } from '../lib/text';
import { tierColor } from '../ui';
import Ring from './Ring';

// End-of-day summary. Closes with the button, a click on the backdrop or Escape.
export default function SummaryModal({ summary, closedTime, onClose }: { summary: SummaryState; closedTime: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tone = tierColor(summary.pct / 100);

  return (
    <div className="anim-fade fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        className="anim-rise max-h-[88vh] w-full max-w-[420px] overflow-y-auto rounded-modal border border-line-strong bg-surface p-6 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <p className="eyebrow m-0">Día cerrado{closedTime ? ` · ${closedTime}` : ''}</p>
          <div className="mt-5">
            <Ring value={summary.pct / 100} size={148} stroke={10} color={tone} label={`${summary.pct}% de tu objetivo cumplido`}>
              <span id="summary-title" className="text-[40px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: tone }}>{summary.pct}%</span>
            </Ring>
          </div>
          <p className="m-0 mt-4 text-[13px] text-fg-3">de tu objetivo cumplido</p>
        </div>

        {summary.improve.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow m-0 mb-2.5">Qué debes mejorar</p>
            <div className="flex flex-wrap gap-2">
              {summary.improve.map((item) => (
                <span key={item} className="badge badge-danger h-7 px-3 text-[12px]">
                  <X size={12} strokeWidth={3} aria-hidden="true" />
                  {sentence(item)}
                </span>
              ))}
            </div>
          </div>
        )}

        <blockquote className="m-0 mt-6 border-l-2 border-line-strong pl-4 text-[14px] italic leading-6 text-fg-2">“{summary.quote}”</blockquote>
        <p className="m-0 mt-4 text-[13px] leading-6 text-fg-3">{summary.callout}</p>

        <button type="button" autoFocus className="btn btn-primary btn-lg mt-6 w-full" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
}

import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ToastState } from '../store';

// Transient feedback. Tap to dismiss. Colour is paired with an icon so the
// tone never relies on colour alone.
export default function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const red = toast.tone === 'red';
  const Icon = red ? CircleAlert : CircleCheck;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <button
        type="button"
        role="status"
        aria-live="polite"
        onClick={onDismiss}
        className="anim-toast pointer-events-auto flex w-full max-w-[420px] cursor-pointer items-start gap-3 rounded-card border bg-surface px-4 py-3 text-left text-[13px] leading-5 text-fg shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]"
        style={{ borderColor: red ? 'var(--color-danger-line)' : 'var(--color-good-line)' }}
      >
        <Icon size={18} className="mt-px shrink-0" style={{ color: red ? 'var(--color-danger)' : 'var(--color-good)' }} aria-hidden="true" />
        <span className="min-w-0 flex-1">{toast.message}</span>
      </button>
    </div>
  );
}

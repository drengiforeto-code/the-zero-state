import { useState } from 'react';
import { Check, CircleAlert, CircleCheck, Lock, Pencil, Play, X } from 'lucide-react';
import { BLOQUES, isAnswered, isOk } from '../habits';
import type { HabitDef, HabitEntry } from '../habits';
import { sentence } from '../lib/text';
import HabitCard from './HabitCard';

function SectionHeader({ title, hint, progress }: { title: string; hint?: string; progress?: { done: number; total: number } }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {hint && <p className="help mt-0.5">{hint}</p>}
      </div>
      {progress && (
        <span className={`badge shrink-0 tabular-nums ${progress.done === progress.total ? 'badge-ok' : ''}`}>
          {progress.done}/{progress.total}
        </span>
      )}
    </div>
  );
}

// Once the day has started, last night's habits fold into a one-glance summary
// so the rest of the day is what you see. "Editar" reopens the full cards.
function StartSummary({
  title,
  habits,
  entries,
  dayStartTime,
  open,
  onToggle,
  children,
}: {
  title: string;
  habits: HabitDef[];
  entries: Record<string, HabitEntry>;
  dayStartTime: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const states = habits.map((h) => ({
    h,
    state: !isAnswered(h, entries[h.id]) ? ('pending' as const) : isOk(h, entries[h.id]) ? ('ok' as const) : ('bad' as const),
  }));
  const okCount = states.filter((x) => x.state === 'ok').length;
  const pending = states.filter((x) => x.state === 'pending').length;

  return (
    <section className="card overflow-hidden p-0" aria-label={title}>
      <div className="flex items-start gap-3 px-4 pb-3.5 pt-4 sm:px-5">
        <CircleCheck size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="section-title">{title}</h2>
          <p className="help mt-0.5">
            Día iniciado{dayStartTime && ` a las ${dayStartTime}`} · {okCount} de {habits.length} cumplidos
            {pending > 0 && <span className="text-danger-fg"> · {pending} sin responder</span>}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm shrink-0" aria-expanded={open} onClick={onToggle}>
          {open ? <Check size={14} aria-hidden="true" /> : <Pencil size={13} aria-hidden="true" />}
          {open ? 'Listo' : 'Editar'}
        </button>
      </div>

      {!open && (
        <ul className="m-0 flex list-none flex-wrap gap-2 px-4 pb-4 sm:px-5">
          {states.map(({ h, state }) => (
            <li key={h.id} className={`badge h-7 px-3 text-[12px] ${state === 'ok' ? 'badge-ok' : state === 'bad' ? 'badge-danger' : ''}`}>
              {state === 'ok' && <Check size={12} strokeWidth={3} aria-hidden="true" />}
              {state === 'bad' && <X size={12} strokeWidth={3} aria-hidden="true" />}
              {sentence(h.nombre)}
              <span className="sr-only"> — {state === 'ok' ? 'cumplido' : state === 'bad' ? 'fallado' : 'pendiente'}</span>
            </li>
          ))}
        </ul>
      )}

      {open && <div className="flex flex-col gap-3 border-t border-line bg-sunken p-4 sm:p-5">{children}</div>}
    </section>
  );
}

// Day flow: last night's habits → "Iniciar el día" → the rest of the day.
// Until the day starts, the rest of the day is shown locked below the button.
export default function TrackerView({
  dateLabel,
  dayStarted,
  dayStartTime,
  closed,
  habits,
  entries,
  habitNumber,
  startHint,
  closeHint,
  canClose,
  onStart,
  onClose,
  onChangeEntry,
  onFeedback,
}: {
  dateLabel: string;
  dayStarted: boolean;
  dayStartTime: string;
  closed: boolean;
  // Active habits, already sorted by block and order.
  habits: HabitDef[];
  entries: Record<string, HabitEntry>;
  habitNumber: Map<string, number>;
  // Why starting / closing is blocked, or '' when it isn't.
  startHint: string;
  closeHint: string;
  canClose: boolean;
  onStart: () => void;
  onClose: () => void;
  onChangeEntry: (id: string, entry: HabitEntry) => void;
  onFeedback: (ok: boolean, message: string) => void;
}) {
  const [startOpen, setStartOpen] = useState(false);

  const inicio = habits.filter((h) => h.bloque === 'inicio');
  const inicioTitle = BLOQUES.find((b) => b.id === 'inicio')?.label ?? 'Inicio';
  const rest = BLOQUES.filter((b) => b.id !== 'inicio')
    .map((b) => ({ block: b, list: habits.filter((h) => h.bloque === b.id) }))
    .filter((x) => x.list.length > 0);

  const renderHabit = (h: HabitDef) => (
    <HabitCard
      key={h.id}
      habit={h}
      number={habitNumber.get(h.id) ?? 0}
      entry={entries[h.id]}
      onChange={(e) => onChangeEntry(h.id, e)}
      onFeedback={onFeedback}
    />
  );

  const restSections = rest.map(({ block, list }) => (
    <section key={block.id}>
      <SectionHeader
        title={block.label}
        hint={block.hint}
        progress={dayStarted ? { done: list.filter((h) => isAnswered(h, entries[h.id])).length, total: list.length } : undefined}
      />
      <div className="flex flex-col gap-3">{list.map(renderHabit)}</div>
    </section>
  ));

  return (
    <div className="anim-rise">
      <h1 className="page-title">Hoy</h1>
      <p className="page-sub">
        {dateLabel}
        {dayStarted && dayStartTime && <span> · Iniciado a las {dayStartTime}</span>}
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {/* Last night + waking up */}
        {inicio.length > 0 &&
          (dayStarted ? (
            <StartSummary title={inicioTitle} habits={inicio} entries={entries} dayStartTime={dayStartTime} open={startOpen} onToggle={() => setStartOpen(!startOpen)}>
              {inicio.map(renderHabit)}
            </StartSummary>
          ) : (
            <section>
              <SectionHeader title={inicioTitle} hint="Responde cómo llegas al día. Con eso se habilita el resto." />
              <div className="flex flex-col gap-3">{inicio.map(renderHabit)}</div>
            </section>
          ))}

        {/* The start button sits between last night and the rest of the day. */}
        {!dayStarted && (
          <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="section-title">Iniciar el día</h2>
              {startHint ? (
                <p className="m-0 mt-1 flex items-start gap-1.5 text-[12px] leading-[18px] text-danger-fg">
                  <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {startHint}
                </p>
              ) : (
                <p className="help mt-1">Todo listo. Desde aquí, cada movimiento cuenta.</p>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={!!startHint} onClick={onStart}>
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Iniciar el día
            </button>
          </div>
        )}
        {dayStarted && inicio.length === 0 && (
          <div className="card flex items-center gap-3 px-4 py-3.5">
            <CircleCheck size={18} className="shrink-0 text-accent" aria-hidden="true" />
            <p className="m-0 text-[13px] text-fg-2">Día iniciado{dayStartTime && <span className="text-fg-3"> · {dayStartTime}</span>}</p>
          </div>
        )}

        {/* Rest of the day: locked until the day starts. */}
        {rest.length > 0 &&
          (dayStarted ? (
            restSections
          ) : (
            <div>
              <p className="m-0 mb-4 flex items-center gap-2 text-[12px] text-fg-3">
                <Lock size={13} aria-hidden="true" />
                Se desbloquea al iniciar el día
              </p>
              {/* inert: not focusable or clickable until the day starts. */}
              <div inert aria-hidden="true" className="flex select-none flex-col gap-8 opacity-40">
                {restSections}
              </div>
            </div>
          ))}

        {dayStarted && (
          <div className="card flex flex-col gap-4">
            <div>
              <h2 className="section-title">{closed ? 'Día cerrado' : 'Cerrar mi día'}</h2>
              <p className="help mt-1">
                {closed
                  ? 'Tu auditoría ya quedó registrada en el historial.'
                  : 'Tus respuestas se guardan solas en este dispositivo. Al cerrar el día se registran en el historial.'}
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-lg w-full" disabled={!closed && !canClose} onClick={onClose}>
              {closed ? 'Iniciar nuevo día' : 'Cerrar mi día'}
            </button>
            {!canClose && !closed && closeHint && (
              <p className="m-0 flex items-start gap-1.5 text-[12px] leading-[18px] text-danger-fg">
                <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {closeHint}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

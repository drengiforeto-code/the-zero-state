import { CircleAlert, CircleCheck, Lock, Play } from 'lucide-react';
import { BLOQUES } from '../habits';
import type { HabitDef, HabitEntry } from '../habits';
import HabitCard from './HabitCard';

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      <h2 className="section-title">{title}</h2>
      {hint && <p className="help mt-0.5">{hint}</p>}
    </div>
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
  const inicio = habits.filter((h) => h.bloque === 'inicio');
  const inicioBlock = BLOQUES.find((b) => b.id === 'inicio');
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
      <SectionHeader title={block.label} hint={block.hint} />
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

      <div className="mt-8">
        {inicio.length > 0 && (
          <section>
            <SectionHeader title={inicioBlock?.label ?? 'Inicio'} hint="Responde cómo llegas al día. Con eso se habilita el resto." />
            <div className="flex flex-col gap-3">{inicio.map(renderHabit)}</div>
          </section>
        )}

        {/* The start button sits between last night and the rest of the day. */}
        <div className={inicio.length > 0 ? 'mt-8' : ''}>
          {dayStarted ? (
            <div className="card flex items-center gap-3 px-4 py-3.5">
              <CircleCheck size={18} className="shrink-0 text-accent" aria-hidden="true" />
              <p className="m-0 text-[13px] text-fg-2">
                Día iniciado{dayStartTime && <span className="text-fg-3"> · {dayStartTime}</span>}
              </p>
            </div>
          ) : (
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
        </div>

        {rest.length > 0 && (
          <div className="mt-8">
            {dayStarted ? (
              <div className="flex flex-col gap-8">{restSections}</div>
            ) : (
              <>
                <p className="m-0 mb-4 flex items-center gap-2 text-[12px] text-fg-3">
                  <Lock size={13} aria-hidden="true" />
                  Se desbloquea al iniciar el día
                </p>
                {/* inert: not focusable or clickable until the day starts. */}
                <div inert aria-hidden="true" className="flex select-none flex-col gap-8 opacity-40">
                  {restSections}
                </div>
              </>
            )}
          </div>
        )}

        {dayStarted && (
          <div className="card mt-8 flex flex-col gap-4">
            <div>
              <h2 className="section-title">{closed ? 'Día cerrado' : 'Cerrar mi día'}</h2>
              <p className="help mt-1">
                {closed ? 'Tu auditoría ya quedó registrada en el historial.' : 'Guarda la auditoría de hoy en tu historial.'}
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

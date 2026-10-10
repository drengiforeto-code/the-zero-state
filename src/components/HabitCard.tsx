import { useEffect, useId, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { emptyEntry, isChecklist, isFailed, isOk } from '../habits';
import type { HabitDef, HabitEntry, SubStatus } from '../habits';
import { sentence } from '../lib/text';
import { choiceClass, chipClass } from '../ui';

// One card per habit, rendered entirely from its definition: answer options
// (any number, each flagged as fulfilling or not) or a subtask checklist,
// plus the failure-reason picker and an optional note.
//
// A fulfilled habit folds into a one-line row so the screen shows what's
// still pending; tapping the row opens it again. Failed habits stay open —
// they're what needs attention (and the reason picker lives there).
export default function HabitCard({
  habit,
  number,
  entry = emptyEntry(),
  onChange,
  onFeedback,
}: {
  habit: HabitDef;
  number: number;
  entry?: HabitEntry;
  onChange: (entry: HabitEntry) => void;
  onFeedback: (ok: boolean, message: string) => void;
}) {
  const uid = useId();
  const failed = isFailed(habit, entry);
  const ok = !failed && isOk(habit, entry);
  const showReasons = failed && !isChecklist(habit);
  const name = sentence(habit.nombre);

  const [collapsed, setCollapsed] = useState(ok);
  useEffect(() => {
    if (!ok) { setCollapsed(false); return; }
    // Habits with a note stay open after answering so the note can be typed.
    if (habit.conNota) return;
    const t = window.setTimeout(() => setCollapsed(true), 450);
    return () => window.clearTimeout(t);
  }, [ok, habit.conNota]);

  const pickOption = (id: string) => {
    const opt = habit.opciones.find((o) => o.id === id);
    if (!opt) return;
    // A fulfilling answer clears any reason left over from a previous failure.
    onChange(opt.ok ? { ...entry, opcion: id, razones: [], otro: false, custom: '' } : { ...entry, opcion: id });
    onFeedback(opt.ok, opt.mensaje ?? (opt.ok ? 'Registrado. Un punto más para la soberanía.' : 'Fallaste. No lo justifiques, corrígelo mañana.'));
  };

  const setSub = (task: string, status: SubStatus) => {
    const next = { ...entry, subtareas: { ...entry.subtareas, [task]: status } };
    onChange(next);
    if (!isOk(habit, entry) && isOk(habit, next)) onFeedback(true, `${name} completo. Los detalles construyen el resultado.`);
    else if (status === 'skip') onFeedback(false, 'Te saltaste los detalles. Nadie construye una mejor versión a medias.');
  };

  const toggleReason = (label: string) =>
    onChange({ ...entry, razones: entry.razones.includes(label) ? entry.razones.filter((x) => x !== label) : [...entry.razones, label] });

  if (ok && collapsed) {
    const answer = isChecklist(habit)
      ? `${habit.subtareas.length}/${habit.subtareas.length}`
      : sentence(habit.opciones.find((o) => o.id === entry.opcion)?.label ?? '');
    return (
      <section className="card anim-fade p-0" style={{ borderColor: 'var(--color-good-line)' }} aria-label={name}>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-inherit sm:px-5"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-good text-bg" role="img" aria-label="Cumplido">
            <Check size={13} strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-fg">{name}</span>
            {entry.nota.trim() && <span className="block truncate text-[12px] text-fg-3">{entry.nota.trim()}</span>}
          </span>
          <span className="max-w-[45%] shrink-0 truncate text-[13px] text-good">{answer}</span>
          <ChevronDown size={16} className="shrink-0 text-fg-3" aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={failed ? { borderColor: 'var(--color-danger-line)' } : ok ? { borderColor: 'var(--color-good-line)' } : undefined}
      aria-label={name}
    >
      <div className="flex items-start gap-3">
        {/* Index that turns into a check / cross once the habit is answered. */}
        <span
          className="mt-px grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors"
          style={{
            background: failed ? 'var(--color-danger)' : ok ? 'var(--color-good)' : 'transparent',
            borderColor: failed ? 'var(--color-danger)' : ok ? 'var(--color-good)' : 'var(--color-line-strong)',
            color: failed || ok ? 'var(--color-bg)' : 'var(--color-fg-3)',
          }}
          role="img"
          aria-label={failed ? 'Fallado' : ok ? 'Cumplido' : 'Pendiente'}
        >
          {failed ? <X size={13} strokeWidth={3} /> : ok ? <Check size={13} strokeWidth={3} /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="card-title">{name}</h3>
          {habit.pregunta && <p className="m-0 mt-0.5 text-[13px] leading-5 text-fg-2">{sentence(habit.pregunta)}</p>}
          {habit.porQue && <p className="help mt-1.5">Por qué: {habit.porQue}</p>}
        </div>
        {ok && (
          <button type="button" className="btn btn-secondary btn-sm btn-icon -mr-1 -mt-1 shrink-0" aria-label="Contraer" onClick={() => setCollapsed(true)}>
            <ChevronUp size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-4">
        {isChecklist(habit) ? (
          <div className="flex flex-col gap-3">
            {habit.subtareas.map((task) => (
              <div key={task} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className="min-w-[140px] flex-1 text-[13px] text-fg-2">{sentence(task)}</span>
                <div className="flex gap-2">
                  <button type="button" className={choiceClass(entry.subtareas[task] === 'done', 'green', 'sm')} aria-pressed={entry.subtareas[task] === 'done'} onClick={() => setSub(task, 'done')}>
                    {entry.subtareas[task] === 'done' && <Check size={14} strokeWidth={2.5} />}Hecho
                  </button>
                  <button type="button" className={choiceClass(entry.subtareas[task] === 'skip', 'red', 'sm')} aria-pressed={entry.subtareas[task] === 'skip'} onClick={() => setSub(task, 'skip')}>
                    {entry.subtareas[task] === 'skip' && <X size={14} strokeWidth={2.5} />}No lo hice
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2">
            {habit.opciones.map((o) => {
              const active = entry.opcion === o.id;
              return (
                <button key={o.id} type="button" className={choiceClass(active, o.ok ? 'green' : 'red')} aria-pressed={active} onClick={() => pickOption(o.id)}>
                  {active && (o.ok ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2.5} />)}
                  {sentence(o.label)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showReasons && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="m-0 mb-3 text-[12px] font-medium text-danger-fg">
            ¿Qué pasó?{habit.razonObligatoria && <span className="ml-1.5 font-normal text-fg-3">(obligatorio)</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {habit.razones.map((label) => (
              <button key={label} type="button" className={chipClass(entry.razones.includes(label))} aria-pressed={entry.razones.includes(label)} onClick={() => toggleReason(label)}>
                {label}
              </button>
            ))}
            <button type="button" className={chipClass(entry.otro)} aria-pressed={entry.otro} onClick={() => onChange({ ...entry, otro: !entry.otro })}>
              Otro
            </button>
          </div>
          {entry.otro && (
            <div className="mt-3">
              <label className="label" htmlFor={`${uid}-custom`}>Cuéntalo con tus palabras{habit.razonObligatoria ? ' (obligatorio)' : ''}</label>
              <textarea
                id={`${uid}-custom`}
                placeholder="¿Qué pasó?"
                value={entry.custom}
                onChange={(e) => onChange({ ...entry, custom: e.target.value })}
                className="textarea"
              />
            </div>
          )}
        </div>
      )}

      {habit.conNota && (
        <div className="mt-4">
          <label className="label" htmlFor={`${uid}-nota`}>Nota <span className="font-normal text-fg-3">(opcional)</span></label>
          <input
            id={`${uid}-nota`}
            type="text"
            placeholder="Añade un detalle"
            value={entry.nota}
            onChange={(e) => onChange({ ...entry, nota: e.target.value })}
            className="input"
          />
        </div>
      )}
    </section>
  );
}

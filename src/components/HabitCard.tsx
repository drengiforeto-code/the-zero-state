import { emptyEntry, isChecklist, isFailed, isOk } from '../habits';
import type { HabitDef, HabitEntry, SubStatus } from '../habits';
import { btnClass, cardClass, cardHeadClass, chipClass, inputClass, textareaClass, whyClass } from '../ui';

// One card per habit, rendered entirely from its definition: answer options
// (any number, each flagged as fulfilling or not) or a subtask checklist,
// plus the failure-reason picker and an optional note.
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
  const failed = isFailed(habit, entry);
  const showReasons = failed && !isChecklist(habit);

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
    if (!isOk(habit, entry) && isOk(habit, next)) onFeedback(true, `${habit.nombre} completo. Los detalles construyen el resultado.`);
    else if (status === 'skip') onFeedback(false, 'Te saltaste los detalles. Nadie construye una mejor versión a medias.');
  };

  const toggleReason = (label: string) =>
    onChange({ ...entry, razones: entry.razones.includes(label) ? entry.razones.filter((x) => x !== label) : [...entry.razones, label] });

  return (
    <div className={cardClass} style={failed ? { borderColor: '#3a1616' } : undefined}>
      <div className={cardHeadClass}>
        {String(number).padStart(2, '0')} // {habit.nombre}{habit.pregunta ? ` — ${habit.pregunta}` : ''}
      </div>
      {habit.porQue && <div className={whyClass}>POR QUÉ: {habit.porQue}</div>}

      {isChecklist(habit) ? (
        <div className="flex flex-col gap-3">
          {habit.subtareas.map((task) => (
            <div key={task} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[#c9c9c9] tracking-wide">{task}</span>
              <div className="flex gap-2">
                <button className={btnClass(entry.subtareas[task] === 'done', 'green')} onClick={() => setSub(task, 'done')}>HECHO</button>
                <button className={btnClass(entry.subtareas[task] === 'skip', 'red')} onClick={() => setSub(task, 'skip')}>NO LO HICE</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {habit.opciones.map((o) => (
            <button key={o.id} className={btnClass(entry.opcion === o.id, o.ok ? 'green' : 'red')} onClick={() => pickOption(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {showReasons && (
        <div className="mt-3.5">
          <div className="text-[11px] text-[#ff8080] tracking-wide mb-2">
            ¿QUÉ PASÓ?{habit.razonObligatoria ? ' (OBLIGATORIO)' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            {habit.razones.map((label) => (
              <button key={label} className={chipClass(entry.razones.includes(label))} onClick={() => toggleReason(label)}>
                {label}
              </button>
            ))}
            <button className={chipClass(entry.otro)} onClick={() => onChange({ ...entry, otro: !entry.otro })}>
              OTRO (ESCRIBIR)
            </button>
          </div>
          {entry.otro && (
            <textarea
              placeholder={habit.razonObligatoria ? 'Redacta qué pasó — obligatorio' : 'Redacta qué pasó'}
              value={entry.custom}
              onChange={(e) => onChange({ ...entry, custom: e.target.value })}
              className={textareaClass}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}

      {habit.conNota && (
        <input
          type="text"
          placeholder="Nota (opcional)"
          value={entry.nota}
          onChange={(e) => onChange({ ...entry, nota: e.target.value })}
          className={inputClass}
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );
}

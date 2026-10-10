import { useId, useState } from 'react';
import { ArchiveRestore, ArrowDown, ArrowUp, CircleAlert, Plus, X } from 'lucide-react';
import { BLOQUES, isChecklist, newHabitId } from '../habits';
import type { Bloque, HabitDef, HabitOption } from '../habits';
import { sentence } from '../lib/text';
import { segClass } from '../ui';
import InstallCard from './InstallCard';

// ---------------------------------------------------------------------------
// Habit manager: create, edit, reorder and archive habits. Archiving (instead
// of deleting) keeps old days in the reports intact.
// ---------------------------------------------------------------------------

type Tipo = 'opciones' | 'checklist';

interface Draft {
  habit: HabitDef;
  tipo: Tipo;
  razonesText: string;
  isNew: boolean;
}

function blankHabit(orden: number): HabitDef {
  return {
    id: newHabitId(), nombre: '', pregunta: '', porQue: '', bloque: 'dia', orden, activo: true,
    opciones: [
      { id: 'o1', label: 'LO HICE', ok: true },
      { id: 'o2', label: 'NO LO HICE', ok: false },
    ],
    subtareas: [], razones: [], razonObligatoria: false, conNota: false,
  };
}

function validate(d: Draft): string | null {
  if (!d.habit.nombre.trim()) return 'Ponle nombre al hábito.';
  if (d.tipo === 'opciones') {
    const opts = d.habit.opciones.filter((o) => o.label.trim());
    if (opts.length < 2) return 'Necesitas al menos 2 opciones de respuesta.';
    if (!opts.some((o) => o.ok)) return 'Al menos una opción debe contar como cumplido.';
  } else {
    const tasks = d.habit.subtareas.map((t) => t.trim()).filter(Boolean);
    if (tasks.length < 1) return 'Agrega al menos una subtarea.';
    if (new Set(tasks.map((t) => t.toUpperCase())).size !== tasks.length) return 'Hay subtareas repetidas.';
  }
  return null;
}

function finalize(d: Draft): HabitDef {
  const h = d.habit;
  return {
    ...h,
    nombre: h.nombre.trim().toUpperCase(),
    pregunta: h.pregunta.trim().toUpperCase(),
    porQue: h.porQue.trim(),
    opciones: d.tipo === 'opciones'
      ? h.opciones.filter((o) => o.label.trim()).map((o) => ({ ...o, label: o.label.trim().toUpperCase() }))
      : [],
    subtareas: d.tipo === 'checklist' ? h.subtareas.map((t) => t.trim().toUpperCase()).filter(Boolean) : [],
    razones: d.razonesText.split(',').map((r) => r.trim()).filter(Boolean),
  };
}

// Habits are stored in UPPERCASE; the editor shows them in sentence case and
// finalize() restores the stored form on save.
function toDraft(h: HabitDef): HabitDef {
  const copy = structuredClone(h);
  return {
    ...copy,
    nombre: sentence(copy.nombre),
    pregunta: sentence(copy.pregunta),
    opciones: copy.opciones.map((o) => ({ ...o, label: sentence(o.label) })),
    subtareas: copy.subtareas.map(sentence),
  };
}

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="help mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="m-0 text-[13px] font-medium text-fg">{label}</p>
        {hint && <p className="help mt-0.5">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={onChange} />
    </div>
  );
}

export default function SettingsTab({
  habits,
  syncError,
  onSave,
  onError,
}: {
  habits: HabitDef[];
  syncError: string | null;
  onSave: (changed: HabitDef[]) => void;
  onError: (message: string) => void;
}) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft | null>(null);

  const active = habits.filter((h) => h.activo).sort((a, b) => a.orden - b.orden);
  const archived = habits.filter((h) => !h.activo);

  const edit = (h: HabitDef) => setDraft({ habit: toDraft(h), tipo: isChecklist(h) ? 'checklist' : 'opciones', razonesText: h.razones.join(', '), isNew: false });
  const create = () => setDraft({ habit: blankHabit(Math.max(-1, ...habits.map((h) => h.orden)) + 1), tipo: 'opciones', razonesText: '', isNew: true });

  // Swap with the neighbour inside the same block (blocks are ordered on
  // their own in the tracker, so moving across blocks is done via edit).
  const move = (h: HabitDef, dir: -1 | 1) => {
    const sameBlock = active.filter((x) => x.bloque === h.bloque);
    const other = sameBlock[sameBlock.indexOf(h) + dir];
    if (!other) return;
    onSave([{ ...h, orden: other.orden }, { ...other, orden: h.orden }]);
  };

  const save = () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) { onError(problem); return; }
    onSave([finalize(draft)]);
    setDraft(null);
  };

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------
  if (draft) {
    const h = draft.habit;
    const setH = (p: Partial<HabitDef>) => setDraft({ ...draft, habit: { ...h, ...p } });
    const setOpt = (i: number, p: Partial<HabitOption>) => setH({ opciones: h.opciones.map((o, j) => (j === i ? { ...o, ...p } : o)) });
    const blockHint = BLOQUES.find((b) => b.id === h.bloque)?.hint;

    return (
      <div className="anim-rise">
        <h1 className="page-title">{draft.isNew ? 'Nuevo hábito' : 'Editar hábito'}</h1>
        <p className="page-sub">{draft.isNew ? 'Define qué vas a registrar cada día.' : sentence(h.nombre)}</p>

        <div className="mt-6 flex flex-col gap-3">
          <section className="card flex flex-col gap-5">
            <h2 className="section-title">General</h2>
            <Field label="Nombre" htmlFor={`${uid}-nombre`}>
              <input id={`${uid}-nombre`} className="input" placeholder="Ej. Leer 20 min" value={h.nombre} onChange={(e) => setH({ nombre: e.target.value })} />
            </Field>
            <Field label="Pregunta (opcional)" htmlFor={`${uid}-pregunta`}>
              <input id={`${uid}-pregunta`} className="input" placeholder="Ej. ¿Leí antes de dormir?" value={h.pregunta} onChange={(e) => setH({ pregunta: e.target.value })} />
            </Field>
            <Field label="Por qué lo haces (opcional)" htmlFor={`${uid}-porque`}>
              <input id={`${uid}-porque`} className="input" placeholder="Ej. La mente también se entrena." value={h.porQue} onChange={(e) => setH({ porQue: e.target.value })} />
            </Field>
            <Field label="Bloque del día" hint={blockHint}>
              <div className="seg grid w-full grid-cols-2 sm:grid-cols-4" role="group" aria-label="Bloque del día">
                {BLOQUES.map((b) => (
                  <button key={b.id} type="button" aria-pressed={h.bloque === b.id} className={`${segClass(h.bloque === b.id)} h-8 px-2`} onClick={() => setH({ bloque: b.id as Bloque })}>
                    {b.label}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="card flex flex-col gap-5">
            <h2 className="section-title">Respuesta</h2>
            <Field label="Tipo de respuesta">
              <div className="seg w-full" role="group" aria-label="Tipo de respuesta">
                <button type="button" aria-pressed={draft.tipo === 'opciones'} className={segClass(draft.tipo === 'opciones')} onClick={() => setDraft({ ...draft, tipo: 'opciones' })}>Opciones</button>
                <button type="button" aria-pressed={draft.tipo === 'checklist'} className={segClass(draft.tipo === 'checklist')} onClick={() => setDraft({ ...draft, tipo: 'checklist' })}>Checklist</button>
              </div>
            </Field>

            {draft.tipo === 'opciones' ? (
              <Field label="Opciones" hint="Marca cuáles cuentan como cumplido.">
                <div className="flex flex-col gap-2">
                  {h.opciones.map((o, i) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        className="input min-w-0 flex-1"
                        value={o.label}
                        placeholder="Texto del botón"
                        aria-label={`Opción ${i + 1}`}
                        // Focus a freshly added row so typing goes into it, not into the "add" button.
                        autoFocus={!o.label && i === h.opciones.length - 1}
                        onChange={(e) => setOpt(i, { label: e.target.value })}
                      />
                      <button
                        type="button"
                        className={`btn btn-sm w-[88px] shrink-0 ${o.ok ? 'btn-good' : 'btn-danger'}`}
                        aria-pressed={o.ok}
                        onClick={() => setOpt(i, { ok: !o.ok })}
                      >
                        {o.ok ? 'Cumple' : 'Falla'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm btn-icon shrink-0" onClick={() => setH({ opciones: h.opciones.filter((_, j) => j !== i) })} aria-label="Quitar opción">
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm self-start"
                    onClick={() => setH({ opciones: [...h.opciones, { id: 'o' + Date.now().toString(36), label: '', ok: false }] })}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Agregar opción
                  </button>
                </div>
              </Field>
            ) : (
              <Field label="Subtareas" hint="Se cumple si haces todas.">
                <div className="flex flex-col gap-2">
                  {h.subtareas.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="input min-w-0 flex-1"
                        value={t}
                        placeholder="Ej. Hielo en los ojos"
                        aria-label={`Subtarea ${i + 1}`}
                        autoFocus={!t && i === h.subtareas.length - 1}
                        onChange={(e) => setH({ subtareas: h.subtareas.map((x, j) => (j === i ? e.target.value : x)) })}
                      />
                      <button type="button" className="btn btn-secondary btn-sm btn-icon shrink-0" onClick={() => setH({ subtareas: h.subtareas.filter((_, j) => j !== i) })} aria-label="Quitar subtarea">
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => setH({ subtareas: [...h.subtareas, ''] })}>
                    <Plus size={14} aria-hidden="true" />
                    Agregar subtarea
                  </button>
                </div>
              </Field>
            )}

            {draft.tipo === 'opciones' && (
              <Field label="Razones de fallo" htmlFor={`${uid}-razones`} hint="Separadas por coma.">
                <input
                  id={`${uid}-razones`}
                  className="input"
                  placeholder="Ej. Cansancio, Se me olvidó, Pereza"
                  value={draft.razonesText}
                  onChange={(e) => setDraft({ ...draft, razonesText: e.target.value })}
                />
              </Field>
            )}
          </section>

          <section className="card flex flex-col gap-5">
            <h2 className="section-title">Opciones avanzadas</h2>
            {draft.tipo === 'opciones' && (
              <Toggle
                label="Respuesta y razón obligatorias"
                hint="No podrás cerrar el día sin responder, ni fallar sin explicar por qué."
                checked={h.razonObligatoria}
                onChange={() => setH({ razonObligatoria: !h.razonObligatoria })}
              />
            )}
            <Toggle label="Campo de nota" hint="Añade un campo de texto libre a la tarjeta." checked={h.conNota} onChange={() => setH({ conNota: !h.conNota })} />
          </section>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={save}>Guardar hábito</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------
  return (
    <div className="anim-rise">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Gestor de hábitos</p>
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={create}>
          <Plus size={16} aria-hidden="true" />
          Nuevo hábito
        </button>
      </div>

      <div className="mt-6">
        <InstallCard />
      </div>

      {syncError && (
        <div className="alert alert-danger mt-6" role="alert">
          <CircleAlert size={18} className="mt-px shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 font-medium">Sin sincronizar con Supabase</p>
            <p className="m-0 mt-0.5 break-words text-[12px] opacity-90">{syncError.replace(/\.$/, '')}. Los cambios se guardan en este dispositivo.</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8">
        {BLOQUES.map((b) => {
          const list = active.filter((h) => h.bloque === b.id);
          return (
            <section key={b.id}>
              <h2 className="section-title">{b.label}</h2>
              <p className="help mb-3 mt-0.5">{b.hint}</p>
              {list.length === 0 ? (
                <p className="empty m-0 !py-5">Sin hábitos en este bloque</p>
              ) : (
                <ul className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
                  {list.map((h, i) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                      <div className="min-w-[160px] flex-1">
                        <p className="m-0 truncate text-[14px] font-medium text-fg">{sentence(h.nombre)}</p>
                        <p className="help m-0 truncate">
                          {isChecklist(h) ? `Checklist · ${h.subtareas.length} subtareas` : h.opciones.map((o) => sentence(o.label)).join(' · ')}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={i === 0} onClick={() => move(h, -1)} aria-label={`Subir ${sentence(h.nombre)}`}>
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={i === list.length - 1} onClick={() => move(h, 1)} aria-label={`Bajar ${sentence(h.nombre)}`}>
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => edit(h)}>Editar</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => onSave([{ ...h, activo: false }])}>Quitar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {archived.length > 0 && (
          <section>
            <h2 className="section-title">Archivados <span className="font-normal text-fg-3">({archived.length})</span></h2>
            <p className="help mb-3 mt-0.5">No cuentan en el día, pero su historial se conserva.</p>
            <ul className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
              {archived.map((h) => (
                <li key={h.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg-3">{sentence(h.nombre)}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm shrink-0"
                    onClick={() => onSave([{ ...h, activo: true, orden: Math.max(...habits.map((x) => x.orden)) + 1 }])}
                  >
                    <ArchiveRestore size={14} aria-hidden="true" />
                    Restaurar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

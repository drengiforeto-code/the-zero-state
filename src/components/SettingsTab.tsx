import { useState } from 'react';
import { BLOQUES, isChecklist, newHabitId } from '../habits';
import type { Bloque, HabitDef, HabitOption } from '../habits';
import { btnClass, cardClass, inputClass, primaryBtnClass, smallBtnClass, viewBtnClass } from '../ui';

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

const labelClass = 'text-[10px] text-[#8a8a8a] tracking-wide mb-1.5 block';

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
  const [draft, setDraft] = useState<Draft | null>(null);

  const active = habits.filter((h) => h.activo).sort((a, b) => a.orden - b.orden);
  const archived = habits.filter((h) => !h.activo);

  const edit = (h: HabitDef) => setDraft({ habit: structuredClone(h), tipo: isChecklist(h) ? 'checklist' : 'opciones', razonesText: h.razones.join(', '), isNew: false });
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

  if (draft) {
    const h = draft.habit;
    const setH = (p: Partial<HabitDef>) => setDraft({ ...draft, habit: { ...h, ...p } });
    const setOpt = (i: number, p: Partial<HabitOption>) => setH({ opciones: h.opciones.map((o, j) => (j === i ? { ...o, ...p } : o)) });

    return (
      <>
        <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">
          GESTOR // {draft.isNew ? 'NUEVO HÁBITO' : 'EDITAR ' + h.nombre}
        </div>
        <div className={`${cardClass} flex flex-col gap-4`}>
          <div>
            <label className={labelClass}>NOMBRE</label>
            <input className={inputClass} placeholder="Ej. Leer 20 min" value={h.nombre} onChange={(e) => setH({ nombre: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>PREGUNTA (OPCIONAL)</label>
            <input className={inputClass} placeholder="Ej. ¿Leí antes de dormir?" value={h.pregunta} onChange={(e) => setH({ pregunta: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>POR QUÉ (OPCIONAL)</label>
            <input className={inputClass} placeholder="Ej. La mente también se entrena." value={h.porQue} onChange={(e) => setH({ porQue: e.target.value })} />
          </div>

          <div>
            <label className={labelClass}>BLOQUE DEL DÍA</label>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOQUES.map((b) => (
                <button key={b.id} className={viewBtnClass(h.bloque === b.id)} onClick={() => setH({ bloque: b.id as Bloque })}>
                  {b.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#7d7d7d] mt-1.5">{BLOQUES.find((b) => b.id === h.bloque)?.hint}</div>
          </div>

          <div>
            <label className={labelClass}>TIPO DE RESPUESTA</label>
            <div className="flex gap-1.5">
              <button className={viewBtnClass(draft.tipo === 'opciones')} onClick={() => setDraft({ ...draft, tipo: 'opciones' })}>OPCIONES</button>
              <button className={viewBtnClass(draft.tipo === 'checklist')} onClick={() => setDraft({ ...draft, tipo: 'checklist' })}>CHECKLIST</button>
            </div>
          </div>

          {draft.tipo === 'opciones' ? (
            <div>
              <label className={labelClass}>OPCIONES — MARCA CUÁLES CUENTAN COMO CUMPLIDO</label>
              <div className="flex flex-col gap-2">
                {h.opciones.map((o, i) => (
                  <div key={o.id} className="flex gap-2 items-center">
                    <input
                      className={inputClass}
                      value={o.label}
                      placeholder="Texto del botón"
                      // Focus a freshly added row so typing goes into it, not into the "add" button.
                      autoFocus={!o.label && i === h.opciones.length - 1}
                      onChange={(e) => setOpt(i, { label: e.target.value })}
                    />
                    <button
                      className={`${smallBtnClass} shrink-0 w-[92px]`}
                      style={o.ok ? { color: '#f7931a', borderColor: '#f7931a' } : { color: '#ff3333', borderColor: '#ff3333' }}
                      onClick={() => setOpt(i, { ok: !o.ok })}
                    >
                      {o.ok ? '✓ CUMPLE' : '✗ FALLA'}
                    </button>
                    <button
                      className={`${smallBtnClass} shrink-0 text-[#7d7d7d] border-[#2a2a2a]`}
                      onClick={() => setH({ opciones: h.opciones.filter((_, j) => j !== i) })}
                      aria-label="Quitar opción"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className={`${smallBtnClass} text-[#8a8a8a] border-[#2a2a2a] py-2`}
                  onClick={() => setH({ opciones: [...h.opciones, { id: 'o' + Date.now().toString(36), label: '', ok: false }] })}
                >
                  + AGREGAR OPCIÓN
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelClass}>SUBTAREAS — SE CUMPLE SI HACES TODAS</label>
              <div className="flex flex-col gap-2">
                {h.subtareas.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={inputClass}
                      value={t}
                      placeholder="Ej. Hielo en los ojos"
                      autoFocus={!t && i === h.subtareas.length - 1}
                      onChange={(e) => setH({ subtareas: h.subtareas.map((x, j) => (j === i ? e.target.value : x)) })}
                    />
                    <button
                      className={`${smallBtnClass} shrink-0 text-[#7d7d7d] border-[#2a2a2a]`}
                      onClick={() => setH({ subtareas: h.subtareas.filter((_, j) => j !== i) })}
                      aria-label="Quitar subtarea"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className={`${smallBtnClass} text-[#8a8a8a] border-[#2a2a2a] py-2`} onClick={() => setH({ subtareas: [...h.subtareas, ''] })}>
                  + AGREGAR SUBTAREA
                </button>
              </div>
            </div>
          )}

          {draft.tipo === 'opciones' && (
            <>
              <div>
                <label className={labelClass}>RAZONES DE FALLO (SEPARADAS POR COMA)</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Cansancio, Se me olvidó, Pereza"
                  value={draft.razonesText}
                  onChange={(e) => setDraft({ ...draft, razonesText: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button className={btnClass(h.razonObligatoria, 'green')} onClick={() => setH({ razonObligatoria: !h.razonObligatoria })}>
                  {h.razonObligatoria ? '✓ ' : ''}RESPUESTA Y RAZÓN OBLIGATORIAS
                </button>
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button className={btnClass(h.conNota, 'green')} onClick={() => setH({ conNota: !h.conNota })}>
              {h.conNota ? '✓ ' : ''}CAMPO DE NOTA
            </button>
          </div>

          <div className="flex gap-2 mt-1">
            <button className={`${smallBtnClass} flex-1 py-[11px] text-[#8a8a8a] border-[#2a2a2a]`} onClick={() => setDraft(null)}>CANCELAR</button>
            <button className={`${primaryBtnClass} flex-1`} onClick={save}>GUARDAR</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-[11px] text-[#8a8a8a] tracking-[1.5px] uppercase mb-4">GESTOR // HÁBITOS</div>

      {syncError && (
        <div className="bg-[#160707] border border-[#ff3333] text-[#ff8080] text-[11px] leading-[1.5] rounded-sm p-[14px_16px] mb-3.5">
          SIN SINCRONIZAR CON SUPABASE: {syncError}. Los cambios se guardan en este dispositivo.
        </div>
      )}

      <button className={`${primaryBtnClass} mb-5`} onClick={create}>+ NUEVO HÁBITO</button>

      {BLOQUES.map((b) => {
        const list = active.filter((h) => h.bloque === b.id);
        return (
          <div key={b.id} className="mb-5">
            <div className="text-[11px] text-[#f7931a] tracking-wide">{b.label}</div>
            <div className="text-[10px] text-[#7d7d7d] mb-2">{b.hint}</div>
            {list.length === 0 && <div className="text-[11px] text-[#666666] italic">Sin hábitos</div>}
            <div className="flex flex-col gap-2">
              {list.map((h, i) => (
                <div key={h.id} className="bg-[#111111] border border-[#232323] rounded-sm p-3 flex flex-col gap-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#e5e5e5] truncate">{h.nombre}</div>
                    <div className="text-[10px] text-[#7d7d7d] truncate">
                      {isChecklist(h) ? `CHECKLIST · ${h.subtareas.length} subtareas` : h.opciones.map((o) => o.label).join(' / ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`${smallBtnClass} text-[#8a8a8a] border-[#2a2a2a] disabled:opacity-30`} disabled={i === 0} onClick={() => move(h, -1)} aria-label="Subir">↑</button>
                    <button className={`${smallBtnClass} text-[#8a8a8a] border-[#2a2a2a] disabled:opacity-30`} disabled={i === list.length - 1} onClick={() => move(h, 1)} aria-label="Bajar">↓</button>
                    <div className="flex-1" />
                    <button className={`${smallBtnClass} text-[#f7931a] border-[#3a2a12]`} onClick={() => edit(h)}>EDITAR</button>
                    <button className={`${smallBtnClass} text-[#ff8080] border-[#3a1e1e]`} onClick={() => onSave([{ ...h, activo: false }])}>QUITAR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {archived.length > 0 && (
        <div className="mt-7">
          <div className="text-[11px] text-[#7d7d7d] tracking-wide mb-1">ARCHIVADOS ({archived.length})</div>
          <div className="text-[10px] text-[#666666] mb-2">No cuentan en el día, pero su historial se conserva.</div>
          <div className="flex flex-col gap-2">
            {archived.map((h) => (
              <div key={h.id} className="bg-[#0d0d0d] border border-[#1c1c1c] rounded-sm px-3 py-2.5 flex items-center gap-2">
                <span className="flex-1 text-[12px] text-[#7d7d7d] truncate">{h.nombre}</span>
                <button
                  className={`${smallBtnClass} text-[#8a8a8a] border-[#2a2a2a]`}
                  onClick={() => onSave([{ ...h, activo: true, orden: Math.max(...habits.map((x) => x.orden)) + 1 }])}
                >
                  RESTAURAR
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { Check, ChevronDown, Pencil, Trash2, X } from 'lucide-react';
import type { HistoryRecord, PillarRecord } from '../store';
import { sentence } from '../lib/text';
import { segClass, tierColor } from '../ui';

const PAGE = 14;

const ratioOf = (pillars: PillarRecord[]) => (pillars.length ? pillars.filter((p) => p.ok).length / pillars.length : 0);

// Day label with the year only when it isn't the current one, so old test
// entries can be told apart at a glance.
function dayLabel(r: HistoryRecord): string {
  const year = r.fecha.slice(0, 4);
  return year === String(new Date().getFullYear()) ? r.dateLabel : `${r.dateLabel} ${year}`;
}

// Closed-day history: expand a day to see what failed, edit which habits were
// met, or delete it. Everything destructive asks for a second tap first.
export default function HistoryList({
  records,
  onSave,
  onDelete,
  onDeleteAll,
}: {
  // Chronological (oldest first), as returned by the database.
  records: HistoryRecord[];
  onSave: (fecha: string, pillars: PillarRecord[]) => Promise<boolean>;
  onDelete: (fecha: string) => Promise<boolean>;
  onDeleteAll: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ fecha: string; pillars: PillarRecord[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const newestFirst = [...records].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, PAGE);

  const run = async (action: () => Promise<boolean>, onDone: () => void) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok) onDone();
  };

  const toggleDay = (fecha: string) => {
    setOpen(open === fecha ? null : fecha);
    setEditing(null);
    setConfirmDelete(null);
  };

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5 max-[480px]:px-4 max-[480px]:pt-4">
        <h2 className="section-title">Historial diario</h2>
        <p className="help mt-0.5">Toca un día para ver el detalle, editarlo o borrarlo.</p>
      </div>

      <ul className="m-0 list-none border-t border-line p-0">
        {visible.map((r) => {
          const expanded = open === r.fecha;
          const pct = Math.round(r.ratio * 100);
          const color = tierColor(r.ratio);
          const failed = r.pillars.filter((p) => !p.ok).map((p) => sentence(p.name));
          const isEditing = editing?.fecha === r.fecha;

          return (
            <li key={r.fecha} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-expanded={expanded}
                className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-5 py-3.5 text-left text-inherit transition-colors hover:bg-raised max-[480px]:px-4"
                onClick={() => toggleDay(r.fecha)}
              >
                <span className="w-[72px] shrink-0 text-[13px] text-fg-2 tabular-nums">{dayLabel(r)}</span>
                <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </span>
                <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                <ChevronDown size={16} className={`shrink-0 text-fg-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {expanded && (
                <div className="anim-fade border-t border-line bg-sunken px-5 py-4 max-[480px]:px-4">
                  {isEditing && editing ? (
                    <>
                      <p className="eyebrow m-0 mb-3">Marca qué cumpliste ese día</p>
                      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                        {editing.pillars.map((p, i) => (
                          <li key={p.id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-[13px] text-fg-2">{sentence(p.name)}</span>
                            <div className="seg shrink-0" role="group" aria-label={sentence(p.name)}>
                              {([true, false] as const).map((value) => (
                                <button
                                  key={String(value)}
                                  type="button"
                                  aria-pressed={p.ok === value}
                                  className={`${segClass(p.ok === value)} inline-flex items-center gap-1.5`}
                                  style={p.ok === value && !value ? { color: 'var(--color-danger-fg)' } : undefined}
                                  onClick={() => setEditing({ ...editing, pillars: editing.pillars.map((x, j) => (j === i ? { ...x, ok: value } : x)) })}
                                >
                                  {value ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <X size={13} strokeWidth={2.5} aria-hidden="true" />}
                                  {value ? 'Sí' : 'No'}
                                </button>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="m-0 mt-4 text-[13px] text-fg-3">
                        Nuevo puntaje{' '}
                        <span className="font-semibold tabular-nums" style={{ color: tierColor(ratioOf(editing.pillars)) }}>{Math.round(ratioOf(editing.pillars) * 100)}%</span>
                      </p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
                        <button type="button" disabled={busy} className="btn btn-primary btn-sm" onClick={() => run(() => onSave(r.fecha, editing.pillars), () => setEditing(null))}>
                          {busy ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {failed.length > 0 && (
                        <>
                          <p className="eyebrow m-0 mb-2.5">Fallaste en</p>
                          <div className="flex flex-wrap gap-2">
                            {failed.map((name) => (
                              <span key={name} className="badge badge-danger h-7 px-3 text-[12px]">
                                <X size={12} strokeWidth={3} aria-hidden="true" />
                                {name}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {r.notes.length > 0 && (
                        <ul className={`m-0 flex list-none flex-col gap-1.5 p-0 ${failed.length > 0 ? 'mt-4' : ''}`}>
                          {r.notes.map((n, i) => (
                            <li key={i} className="text-[13px] leading-5 text-fg-2">
                              <span className="font-medium text-accent">{sentence(n.tag)}</span> · {n.text}
                            </li>
                          ))}
                        </ul>
                      )}
                      {failed.length === 0 && r.notes.length === 0 && r.pillars.length > 0 && (
                        <p className="help m-0">Día completo, sin fallos registrados.</p>
                      )}
                      {r.pillars.length === 0 && <p className="help m-0">Registro antiguo sin detalle por hábito: solo se puede borrar.</p>}

                      {confirmDelete === r.fecha ? (
                        <div className="alert alert-danger mt-4 flex-col" role="alertdialog" aria-label="Confirmar borrado">
                          <p className="m-0">¿Borrar el {dayLabel(r)}? No se puede deshacer.</p>
                          <div className="flex gap-2">
                            <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button type="button" disabled={busy} className="btn btn-danger-solid btn-sm" onClick={() => run(() => onDelete(r.fecha), () => { setConfirmDelete(null); setOpen(null); })}>
                              {busy ? 'Borrando…' : 'Sí, borrar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          {r.pillars.length > 0 && (
                            <button type="button" className="btn btn-accent btn-sm" onClick={() => setEditing({ fecha: r.fecha, pillars: r.pillars.map((p) => ({ ...p })) })}>
                              <Pencil size={13} aria-hidden="true" />
                              Editar
                            </button>
                          )}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(r.fecha)}>
                            <Trash2 size={13} aria-hidden="true" />
                            Borrar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {newestFirst.length > PAGE && (
        <div className="border-t border-line px-5 py-3 max-[480px]:px-4">
          <button type="button" className="btn btn-secondary btn-sm w-full" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Ver solo los últimos 14' : `Ver los ${newestFirst.length} días`}
          </button>
        </div>
      )}

      <div className="border-t border-line px-5 py-4 max-[480px]:px-4">
        {confirmAll ? (
          <div className="alert alert-danger flex-col" role="alertdialog" aria-label="Confirmar borrado total">
            <p className="m-0">Vas a borrar los {records.length} días del historial. No se puede deshacer.</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} className="btn btn-secondary btn-sm" onClick={() => setConfirmAll(false)}>Cancelar</button>
              <button type="button" disabled={busy} className="btn btn-danger-solid btn-sm" onClick={() => run(onDeleteAll, () => { setConfirmAll(false); setOpen(null); })}>
                {busy ? 'Borrando…' : 'Sí, borrar todo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="help m-0">Elimina los {records.length} días registrados.</p>
            <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={() => setConfirmAll(true)}>Borrar todo el historial</button>
          </div>
        )}
      </div>
    </div>
  );
}

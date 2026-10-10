import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HistoryRecord, PillarRecord } from '../store';
import { smallBtnClass, tierColor } from '../ui';

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
    <div className="mt-6">
      <div className="text-[11px] text-[#8a8a8a] tracking-wide mb-3">HISTORIAL DIARIO — TOCA UN DÍA PARA VER, EDITAR O BORRAR</div>
      <div className="flex flex-col gap-2">
        {visible.map((r) => {
          const expanded = open === r.fecha;
          const pct = Math.round(r.ratio * 100);
          const color = tierColor(r.ratio);
          const failed = r.pillars.filter((p) => !p.ok).map((p) => p.name);
          const isEditing = editing?.fecha === r.fecha;

          return (
            <div key={r.fecha} className="bg-[#111111] border border-[#232323] rounded-sm">
              <button
                type="button"
                aria-expanded={expanded}
                className="w-full text-left bg-transparent border-0 p-[14px_16px] cursor-pointer text-inherit"
                onClick={() => toggleDay(r.fecha)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-[#c9c9c9] tracking-wide">{dayLabel(r)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
                    <ChevronDown size={14} color="#7d7d7d" className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                </div>
                <div className="bg-[#1c1c1c] rounded-full h-[3px] w-full overflow-hidden mt-2.5">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </button>

              {expanded && (
                <div className="mx-4 mb-4 border-t border-[#232323] pt-3">
                  {isEditing && editing ? (
                    <>
                      <div className="text-[10px] text-[#8a8a8a] tracking-wide mb-2.5">MARCA QUÉ CUMPLISTE ESE DÍA</div>
                      <div className="flex flex-col gap-2">
                        {editing.pillars.map((p, i) => (
                          <div key={p.id} className="flex items-center justify-between gap-3">
                            <span className="text-[12px] text-[#c9c9c9] min-w-0 truncate">{p.name}</span>
                            <div className="flex gap-1.5 shrink-0">
                              {([true, false] as const).map((value) => (
                                <button
                                  key={String(value)}
                                  type="button"
                                  aria-pressed={p.ok === value}
                                  className={`${smallBtnClass} ${
                                    p.ok === value
                                      ? value ? 'text-[#f7931a] border-[#f7931a] bg-[rgba(247,147,26,0.12)]' : 'text-[#ff3333] border-[#ff3333] bg-[rgba(255,51,51,0.12)]'
                                      : 'text-[#8a8a8a] border-[#2a2a2a]'
                                  }`}
                                  onClick={() => setEditing({ ...editing, pillars: editing.pillars.map((x, j) => (j === i ? { ...x, ok: value } : x)) })}
                                >
                                  {value ? '✓ SÍ' : '✗ NO'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-[#8a8a8a] mt-3">
                        NUEVO PUNTAJE: <span className="font-bold" style={{ color: tierColor(ratioOf(editing.pillars)) }}>{Math.round(ratioOf(editing.pillars) * 100)}%</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="button" disabled={busy} className={`${smallBtnClass} flex-1 text-[#8a8a8a] border-[#2a2a2a]`} onClick={() => setEditing(null)}>
                          CANCELAR
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className={`${smallBtnClass} flex-1 text-[#0a0a0a] bg-[#f7931a]! border-[#f7931a] disabled:opacity-50`}
                          onClick={() => run(() => onSave(r.fecha, editing.pillars), () => setEditing(null))}
                        >
                          {busy ? 'GUARDANDO…' : 'GUARDAR'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {failed.length > 0 && (
                        <>
                          <div className="text-[10px] text-[#ff8080] tracking-wide mb-1.5">FALLASTE EN</div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {failed.map((name) => (
                              <span key={name} className="text-[11px] text-[#ff8080] border border-[#3a1e1e] bg-[rgba(255,51,51,0.08)] px-[9px] py-[5px] rounded-sm">
                                {name}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {r.notes.map((n, i) => (
                        <div key={i} className="text-[12px] text-[#c9c9c9] leading-[1.5] mt-1">
                          <span className="text-[#ff8a4d]">[{n.tag}]</span> {n.text}
                        </div>
                      ))}
                      {r.pillars.length === 0 && (
                        <div className="text-[11px] text-[#8a8a8a] leading-[1.5]">Registro antiguo sin detalle por hábito: solo se puede borrar.</div>
                      )}

                      {confirmDelete === r.fecha ? (
                        <div className="mt-3 border border-[#3a1e1e] bg-[rgba(255,51,51,0.06)] rounded-sm p-3">
                          <div className="text-[11px] text-[#ff8080] leading-[1.5] mb-2.5">¿Borrar el {dayLabel(r)}? No se puede deshacer.</div>
                          <div className="flex gap-2">
                            <button type="button" disabled={busy} className={`${smallBtnClass} flex-1 text-[#8a8a8a] border-[#2a2a2a]`} onClick={() => setConfirmDelete(null)}>
                              CANCELAR
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className={`${smallBtnClass} flex-1 text-[#0a0a0a] bg-[#ff3333]! border-[#ff3333] disabled:opacity-50`}
                              onClick={() => run(() => onDelete(r.fecha), () => { setConfirmDelete(null); setOpen(null); })}
                            >
                              {busy ? 'BORRANDO…' : 'SÍ, BORRAR'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          {r.pillars.length > 0 && (
                            <button
                              type="button"
                              className={`${smallBtnClass} flex-1 text-[#f7931a] border-[#3a2a12]`}
                              onClick={() => setEditing({ fecha: r.fecha, pillars: r.pillars.map((p) => ({ ...p })) })}
                            >
                              EDITAR
                            </button>
                          )}
                          <button type="button" className={`${smallBtnClass} flex-1 text-[#ff8080] border-[#3a1e1e]`} onClick={() => setConfirmDelete(r.fecha)}>
                            BORRAR
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {newestFirst.length > PAGE && (
        <button
          type="button"
          className={`${smallBtnClass} w-full mt-3 text-[#8a8a8a] border-[#2a2a2a]`}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'VER SOLO LOS ÚLTIMOS 14' : `VER LOS ${newestFirst.length} DÍAS`}
        </button>
      )}

      <div className="mt-8 pt-5 border-t border-[#1c1c1c]">
        {confirmAll ? (
          <div className="border border-[#3a1e1e] bg-[rgba(255,51,51,0.06)] rounded-sm p-3.5">
            <div className="text-[11px] text-[#ff8080] leading-[1.5] mb-3">
              Vas a borrar los {records.length} días del historial. No se puede deshacer.
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} className={`${smallBtnClass} flex-1 text-[#8a8a8a] border-[#2a2a2a]`} onClick={() => setConfirmAll(false)}>
                CANCELAR
              </button>
              <button
                type="button"
                disabled={busy}
                className={`${smallBtnClass} flex-1 text-[#0a0a0a] bg-[#ff3333]! border-[#ff3333] disabled:opacity-50`}
                onClick={() => run(onDeleteAll, () => { setConfirmAll(false); setOpen(null); })}
              >
                {busy ? 'BORRANDO…' : 'SÍ, BORRAR TODO'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${smallBtnClass} w-full text-[#ff8080] border-[#3a1e1e]`} onClick={() => setConfirmAll(true)}>
            BORRAR TODO EL HISTORIAL
          </button>
        )}
      </div>
    </div>
  );
}

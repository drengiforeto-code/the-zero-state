import { useState } from 'react';
import { Check, CircleAlert, CircleCheck, History, Lock, Pencil, Play, X } from 'lucide-react';
import { BLOQUES, blockOf, isAnswered, isOk } from '../habits';
import { BLOCK_ICON, habitIcon } from '../icons';
import type { HabitDef, HabitEntry } from '../habits';
import { sentence } from '../lib/text';
import { tierColor } from '../ui';
import HabitCard from './HabitCard';
import TimeReality from './TimeReality';
import Ring from './Ring';

function SectionHeader({ block, title, hint, progress }: { block: ReturnType<typeof blockOf>; title?: string; hint?: string; progress?: { done: number; total: number } }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="icon-tile icon-tile-sm" aria-hidden="true">{(() => { const I = BLOCK_ICON[block.id]; return <I size={17} strokeWidth={1.8} />; })()}</span>
        <div className="min-w-0">
          <h2 className="section-title">{title ?? block.label}</h2>
          {(hint ?? block.hint) && <p className="help mt-0.5">{hint ?? block.hint}</p>}
        </div>
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
        <span className="icon-tile icon-tile-sm" aria-hidden="true"><BLOCK_ICON.inicio size={17} strokeWidth={1.8} /></span>
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
            <li key={h.id} className={`badge h-8 px-3 text-[12px] ${state === 'ok' ? 'badge-ok' : state === 'bad' ? 'badge-danger' : ''}`}>
              {(() => { const I = habitIcon(h); return <I size={13} strokeWidth={2} aria-hidden="true" />; })()}
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

// Today at a glance: coherence ring + what's done, failed and pending.
function TodayPanel({ habits, entries, closed }: { habits: HabitDef[]; entries: Record<string, HabitEntry>; closed: boolean }) {
  const ok = habits.filter((h) => isOk(h, entries[h.id])).length;
  const answered = habits.filter((h) => isAnswered(h, entries[h.id])).length;
  const bad = answered - ok;
  const pending = habits.length - answered;
  const ratio = habits.length ? ok / habits.length : 0;
  const color = tierColor(ratio);
  const rows = [
    { label: 'Cumplidos', value: ok, color: 'var(--color-good)' },
    { label: 'Fallados', value: bad, color: 'var(--color-danger)' },
    { label: 'Pendientes', value: pending, color: 'var(--color-line-strong)' },
  ];

  return (
    <section className="hero flex items-center gap-5 sm:gap-7" aria-label="Resumen de hoy">
      <Ring value={ratio} size={104} stroke={8} color={color} label={`Coherencia de hoy: ${Math.round(ratio * 100)}%`}>
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums" style={{ color }}>{Math.round(ratio * 100)}%</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-3">Coherencia</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[17px] font-bold leading-6 tracking-tight text-fg">
          {answered === 0 ? 'Empieza con el primero' : ratio >= 0.7 ? 'Modo soberano' : ratio >= 0.5 ? 'Vas a medias' : 'Te están ganando'}
        </p>
        <p className="help m-0">
          {closed ? 'Día cerrado' : pending === 0 ? 'Todo registrado' : `${answered} de ${habits.length} registrados`}
        </p>
        <ul className="m-0 mt-3 flex max-w-[300px] list-none flex-col gap-2 p-0">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2 text-fg-3">
                <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                {r.label}
              </span>
              <span className="font-semibold tabular-nums text-fg">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The day is closed: score, start/close times and what failed.
function ClosedPanel({ habits, entries, dayStartTime, closedTime }: { habits: HabitDef[]; entries: Record<string, HabitEntry>; dayStartTime: string; closedTime: string }) {
  const ok = habits.filter((h) => isOk(h, entries[h.id])).length;
  const failed = habits.filter((h) => isAnswered(h, entries[h.id]) && !isOk(h, entries[h.id]));
  const ratio = habits.length ? ok / habits.length : 0;
  const color = tierColor(ratio);
  const rows = [
    { label: 'Iniciado', value: dayStartTime || '—' },
    { label: 'Cerrado', value: closedTime || '—' },
    { label: 'Cumplidos', value: `${ok} de ${habits.length}` },
  ];

  return (
    <section className="hero" aria-label="Día cerrado">
      <div className="flex items-center gap-5 sm:gap-7">
        <Ring value={ratio} size={104} stroke={8} color={color} label={`Día cerrado con ${Math.round(ratio * 100)}% de coherencia`}>
          <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums" style={{ color }}>{Math.round(ratio * 100)}%</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-fg-3">Coherencia</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <span className="badge badge-ok h-7 px-3 text-[12px]">
            <Lock size={12} aria-hidden="true" />
            Día cerrado
          </span>
          <dl className="m-0 mt-3 flex max-w-[300px] flex-col gap-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 text-[13px]">
                <dt className="text-fg-3">{r.label}</dt>
                <dd className="m-0 font-semibold tabular-nums text-fg">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {failed.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow m-0 mb-2.5">Fallaste en</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {failed.map((h) => (
              <li key={h.id} className="badge badge-danger h-7 px-3 text-[12px]">
                <X size={12} strokeWidth={3} aria-hidden="true" />
                {sentence(h.nombre)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="help mt-4">Mañana empieza un día nuevo automáticamente.</p>
    </section>
  );
}

// Day flow: last night's habits → "Iniciar el día" → the rest of the day →
// "Cerrar mi día". Until the day starts, the rest is shown locked below the
// button; once closed, a summary replaces the day and edits sit behind a fold.
export default function TrackerView({
  dateLabel,
  dayStarted,
  dayStartTime,
  closed,
  closedTime,
  staleDayLabel,
  habits,
  entries,
  habitNumber,
  startHint,
  closeHint,
  canClose,
  onStart,
  onClose,
  onSaveClosed,
  onSetEntries,
  onDiscardDay,
  onChangeEntry,
  onFeedback,
}: {
  // The tracked day, shown only when it isn't today's date (e.g. after midnight).
  dateLabel: string;
  dayStarted: boolean;
  dayStartTime: string;
  closed: boolean;
  closedTime: string;
  // Set when the open day was started on an earlier date and never closed.
  staleDayLabel: string;
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
  onSaveClosed: () => Promise<boolean>;
  onSetEntries: (entries: Record<string, HabitEntry>) => void;
  onDiscardDay: () => void;
  onChangeEntry: (id: string, entry: HabitEntry) => void;
  onFeedback: (ok: boolean, message: string) => void;
}) {
  const [startOpen, setStartOpen] = useState(false);
  // Answers as they were when editing a closed day began (for "Cancelar").
  const [editSnapshot, setEditSnapshot] = useState<Record<string, HabitEntry> | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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
        block={block}
        progress={dayStarted ? { done: list.filter((h) => isAnswered(h, entries[h.id])).length, total: list.length } : undefined}
      />
      <div className="flex flex-col gap-3">{list.map(renderHabit)}</div>
    </section>
  ));

  const sub = [
    dateLabel,
    dayStarted && dayStartTime && `Iniciado a las ${dayStartTime}`,
    closed && closedTime && `Cerrado a las ${closedTime}`,
  ].filter(Boolean).join(' · ');

  // Page title, then the time-reality check — the first thing seen every time.
  const header = (
    <>
      <h1 className="page-title">Hoy</h1>
      <p className="page-sub">{sub || 'Aún no has iniciado el día'}</p>
      <div className="mt-6">
        <TimeReality />
      </div>
    </>
  );

  // -------------------------------------------------------------------------
  // Closed day
  // -------------------------------------------------------------------------
  if (closed) {
    const editing = editSnapshot !== null;
    const save = async () => {
      setSaving(true);
      const ok = await onSaveClosed();
      setSaving(false);
      if (ok) setEditSnapshot(null);
    };

    return (
      <div className="anim-rise">
        {header}
        <div className="mt-8 flex flex-col gap-8">
          <ClosedPanel habits={habits} entries={entries} dayStartTime={dayStartTime} closedTime={closedTime} />

          <section className="card overflow-hidden p-0" aria-label="Editar el día">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <History size={20} className="mt-0.5 shrink-0 text-fg-3" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="section-title">Editar el día</h2>
                <p className="help mt-0.5">Corrige una respuesta y guarda: tu historial se actualiza.</p>
              </div>
              {!editing && (
                <button type="button" className="btn btn-secondary btn-sm shrink-0" aria-expanded={false} onClick={() => setEditSnapshot(entries)}>
                  <Pencil size={13} aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>

            {editing && (
              <div className="flex flex-col gap-8 border-t border-line bg-sunken p-4 sm:p-5">
                {inicio.length > 0 && (
                  <section>
                    <SectionHeader block={blockOf('inicio')} />
                    <div className="flex flex-col gap-3">{inicio.map(renderHabit)}</div>
                  </section>
                )}
                {restSections}
                <div className="flex flex-col gap-3">
                  {closeHint && (
                    <p className="m-0 flex items-start gap-1.5 text-[12px] leading-[18px] text-danger-fg">
                      <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {closeHint}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={() => { onSetEntries(editSnapshot); setEditSnapshot(null); }}
                    >
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" disabled={saving || !!closeHint} onClick={save}>
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Open day
  // -------------------------------------------------------------------------
  return (
    <div className="anim-rise">
      {header}

      <div className="mt-8 flex flex-col gap-8">
        {staleDayLabel && (
          <div className="alert flex-col sm:flex-row sm:items-center" role="status">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <CircleAlert size={18} className="mt-px shrink-0 text-fg-2" aria-hidden="true" />
              <div className="min-w-0">
                <p className="m-0 font-medium text-fg">Este día empezó el {staleDayLabel.toLowerCase()}</p>
                <p className="m-0 mt-0.5 text-[12px] text-fg-3">
                  {confirmDiscard
                    ? 'Se pierde lo que registraste ese día.'
                    : 'Ciérralo abajo para guardarlo en su fecha, o descártalo para empezar hoy.'}
                </p>
              </div>
            </div>
            {confirmDiscard ? (
              <div className="flex shrink-0 gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDiscard(false)}>Cancelar</button>
                <button type="button" className="btn btn-danger-solid btn-sm" onClick={() => { setConfirmDiscard(false); onDiscardDay(); }}>Descartar</button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => setConfirmDiscard(true)}>Descartar y empezar hoy</button>
            )}
          </div>
        )}

        {dayStarted && <TodayPanel habits={habits} entries={entries} closed={false} />}

        {/* Last night + waking up */}
        {inicio.length > 0 &&
          (dayStarted ? (
            <StartSummary title={inicioTitle} habits={inicio} entries={entries} dayStartTime={dayStartTime} open={startOpen} onToggle={() => setStartOpen(!startOpen)}>
              {inicio.map(renderHabit)}
            </StartSummary>
          ) : (
            <section>
              <SectionHeader block={blockOf('inicio')} hint="Responde cómo llegas al día. Con eso se habilita el resto." />
              <div className="flex flex-col gap-3">{inicio.map(renderHabit)}</div>
            </section>
          ))}

        {/* The start button sits between last night and the rest of the day. */}
        {!dayStarted && (
          <div className="hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <button type="button" className={`btn btn-primary btn-lg w-full sm:w-auto `} disabled={!!startHint} onClick={onStart}>
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Iniciar el día
            </button>
          </div>
        )}
        {dayStarted && inicio.length === 0 && (
          <div className="card flex items-center gap-3 px-4 py-3.5">
            <CircleCheck size={18} className="shrink-0 text-good" aria-hidden="true" />
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
          <div className="hero flex flex-col gap-4">
            <div>
              <h2 className="section-title">Cerrar mi día</h2>
              <p className="help mt-1">Tus respuestas se guardan solas en este dispositivo. Al cerrar el día se registran en el historial.</p>
            </div>
            <button type="button" className="btn btn-primary btn-lg w-full" disabled={!canClose} onClick={onClose}>
              Cerrar mi día
            </button>
            {!canClose && closeHint && (
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

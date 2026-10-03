-- =============================================================================
-- The Sovereign OS — schema for "dias_cerrados" (closed-day history)
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- =============================================================================

create table if not exists public.dias_cerrados (
  id                uuid primary key default gen_random_uuid(),
  fecha             date not null default current_date,
  score_coherencia  numeric(5,2) not null check (score_coherencia >= 0 and score_coherencia <= 100),
  detalle           jsonb not null,
  created_at        timestamptz not null default now(),

  -- Only one closed day per calendar date.
  constraint dias_cerrados_fecha_unique unique (fecha)
);

comment on table public.dias_cerrados is 'One row per day closed in The Sovereign OS tracker.';
comment on column public.dias_cerrados.fecha is 'Calendar date the day was closed.';
comment on column public.dias_cerrados.score_coherencia is 'Percentage (0-100) of pillars completed that day.';
comment on column public.dias_cerrados.detalle is
  'JSON summary of the day: { habitos_logrados: string[], vectores_ataque: { pilar, razon }[], notas: {...} }';

create index if not exists dias_cerrados_fecha_idx on public.dias_cerrados (fecha desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- This app has no auth/login — every request uses the public "publishable"
-- (anon) key. These policies are intentionally open (anyone with the anon
-- key can read/insert/update) so the app works without a login screen.
-- If you ever add multi-user auth, replace these with policies scoped to
-- auth.uid() and add a user_id column.
-- -----------------------------------------------------------------------------

alter table public.dias_cerrados enable row level security;

create policy "Allow anon read on dias_cerrados"
  on public.dias_cerrados for select
  to anon
  using (true);

create policy "Allow anon insert on dias_cerrados"
  on public.dias_cerrados for insert
  to anon
  with check (true);

create policy "Allow anon update on dias_cerrados"
  on public.dias_cerrados for update
  to anon
  using (true)
  with check (true);

-- =============================================================================
-- habitos — configurable habit definitions (edited from the CONFIG tab).
-- The app seeds this table with its defaults on first load if it's empty.
-- Habits are never deleted from the app, only archived (activo = false), so
-- past days in dias_cerrados keep referring to real habits.
-- =============================================================================

create table if not exists public.habitos (
  id          text primary key,
  orden       integer not null default 0,
  activo      boolean not null default true,
  config      jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.habitos is 'Habit definitions for The Sovereign OS tracker.';
comment on column public.habitos.config is
  'JSON: { nombre, pregunta, porQue, bloque: inicio|manana|dia|noche, opciones: {id,label,ok,mensaje?}[], subtareas: string[], razones: string[], razonObligatoria, conNota }';

create or replace function public.habitos_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists habitos_touch_updated_at on public.habitos;
create trigger habitos_touch_updated_at
  before update on public.habitos
  for each row execute function public.habitos_touch_updated_at();

-- Same open, no-auth model as dias_cerrados (see note above). No delete
-- policy on purpose: the app archives habits instead of deleting them.
alter table public.habitos enable row level security;

create policy "Allow anon read on habitos"
  on public.habitos for select to anon using (true);

create policy "Allow anon insert on habitos"
  on public.habitos for insert to anon with check (true);

create policy "Allow anon update on habitos"
  on public.habitos for update to anon using (true) with check (true);

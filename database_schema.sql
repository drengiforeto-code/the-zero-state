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

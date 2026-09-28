-- ============================================================
--  centros_costos  —  tabla de Centros de Costos del tablero "Bitácora" (Plurum)
--  Ejecutar en: Supabase Dashboard  >  SQL Editor  (proyecto de Datta)
--  Idempotente: se puede re-ejecutar sin romper (IF NOT EXISTS / OR REPLACE).
--
--  MODELO A (confirmado por Susan): una fila por LÍNEA/CONTRATACIÓN.
--  El código `cc` NO es único: agrupa varias líneas (p. ej. 030102 "Conferencias ARO"
--  = 10 contrataciones con distinto objeto y valor_antes_iva). Por eso la PK es `id`
--  y la idempotencia de la semilla se hace por `seed_ref` (no por `cc`).
-- ============================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

create table if not exists public.centros_costos (
  id               uuid primary key default gen_random_uuid(),
  -- seed_ref: hash de los campos de la línea, SOLO para el upsert idempotente de la semilla.
  -- null en altas hechas desde el front.
  seed_ref         text unique,

  -- ---- datos del centro de costos (almacenados) ----
  anio             integer,
  cc               text not null,          -- código (agrupa varias líneas; NO único)
  gerente          text,
  tipo_doc         text,
  nombre_cc        text,
  cliente          text,
  objeto           text,
  valor_usd        numeric,
  valor_antes_iva  numeric not null default 0,

  -- ---- auditoría (texto por correo, como bitacora_proyectos) ----
  creado_por       text,
  creado_en        timestamptz,
  actualizado_por  text,
  actualizado_en   timestamptz,
  -- ---- soft-delete ----
  eliminado_por    text,
  eliminado_en     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- índice de apoyo (NO único) sobre el código de enlace
create index if not exists idx_centros_costos_cc on public.centros_costos (cc);

-- updated_at automático
create or replace function public.centros_costos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_centros_costos_updated_at on public.centros_costos;
create trigger trg_centros_costos_updated_at
  before update on public.centros_costos
  for each row execute function public.centros_costos_set_updated_at();

-- ============================================================
--  RLS  (equivalente a bitacora_proyectos)
-- ============================================================
alter table public.centros_costos enable row level security;

-- Sin DELETE físico: el "eliminar" del tablero es soft-delete vía UPDATE.
grant select, insert, update on public.centros_costos to authenticated;

drop policy if exists cc_select_authenticated on public.centros_costos;
create policy cc_select_authenticated
  on public.centros_costos for select
  to authenticated using (true);

-- Insert: autenticados; se sella el autor con el correo del JWT.
drop policy if exists cc_insert_authenticated on public.centros_costos;
create policy cc_insert_authenticated
  on public.centros_costos for insert
  to authenticated
  with check (creado_por = (auth.jwt() ->> 'email'));

-- Update: autenticados (edición y soft-delete). Sin policy de DELETE => DELETE denegado.
drop policy if exists cc_update_authenticated on public.centros_costos;
create policy cc_update_authenticated
  on public.centros_costos for update
  to authenticated using (true) with check (true);

-- (La semilla corre con SERVICE ROLE, que bypassa RLS; inserta con creado_por = null.)

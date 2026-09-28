-- ============================================================
--  bitacora_proyectos  —  tabla del tablero "Bitácora" (Plurum)
--  Ejecutar en: Supabase Dashboard  >  SQL Editor  (proyecto de Datta)
--  Idempotente: se puede re-ejecutar sin romper (IF NOT EXISTS / OR REPLACE).
--
--  NOTA de diseño (estado): el tablero NO usa el modelo Activo/Cerrado/Eliminado.
--  Los valores reales que maneja el código son los 4 de abajo. "Eliminado" se
--  modela como soft-delete = (estado='Cerrado' AND eliminado_por IS NOT NULL),
--  igual que el index.html actual. Ver reporte para el detalle del porqué.
-- ============================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

create table if not exists public.bitacora_proyectos (
  -- PK estable independiente del contenido: la app edita por `id`. NO se deriva del proyecto.
  id               uuid primary key default gen_random_uuid(),
  -- seed_ref: columna UNIQUE separada, SOLO para el upsert idempotente de la semilla
  -- (hash de los campos del proyecto). null en altas hechas desde el front.
  seed_ref         text unique,

  -- ---- datos del proyecto (almacenados) ----
  anio             integer,
  cliente          text not null,
  nombre_corto     text,
  linea_negocio    text,
  sublinea         text,
  centro_costos    text,                   -- "codigo-nombre_cc"
  fecha_inicio     date,
  fecha_cierre     date,
  tiempo_ejecucion text,
  -- CHECK cubre el set COMPLETO presente en los 57: En proceso=33, Por iniciar=3,
  -- Stand By=5, Cerrado=16 (verificado). "Eliminado" NO es estado (ver soft-delete).
  estado           text not null default 'En proceso'
                     check (estado in ('En proceso','Por iniciar','Stand By','Cerrado')),
  avance_actual    numeric,                -- 0..1 (dato, NO derivado)
  responsable      text,
  valor_proyecto   bigint not null default 0,
  valor_facturado  bigint not null default 0,
  observacion      text,

  -- ---- auditoría (texto por correo, como el front actual) ----
  creado_por       text,
  creado_en        timestamptz,
  cerrado_por      text,
  cerrado_en       timestamptz,
  eliminado_por    text,
  eliminado_en     timestamptz,

  -- ---- columnas GENERADAS (la BD las calcula; ver fórmulas del index.html) ----
  -- cc_code == front ccCode(s): primer run de >=4 dígitos. Verificado equivalente en
  -- los 130 centro_costos (0 discrepancias). En front: String(s).match(/(\d{4,})/)[1].
  cc_code          text   generated always as (substring(centro_costos from '[0-9]{4,}')) stored,
  por_facturar     bigint generated always as (valor_proyecto - valor_facturado) stored,
  pct_por_facturar numeric generated always as (
                     case when valor_proyecto > 0
                          then (valor_proyecto - valor_facturado)::numeric / valor_proyecto * 100
                          else 0 end
                   ) stored,
  categoria        text   generated always as (
                     case when valor_proyecto >= 80000000 then 'A'
                          when valor_proyecto >= 30000000 then 'B'
                          else 'C' end
                   ) stored,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at automático
create or replace function public.bitacora_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_bitacora_updated_at on public.bitacora_proyectos;
create trigger trg_bitacora_updated_at
  before update on public.bitacora_proyectos
  for each row execute function public.bitacora_set_updated_at();

-- índices de apoyo para el tablero
create index if not exists idx_bitacora_estado  on public.bitacora_proyectos (estado);
create index if not exists idx_bitacora_cc_code on public.bitacora_proyectos (cc_code);

-- ============================================================
--  RLS
-- ============================================================
alter table public.bitacora_proyectos enable row level security;

-- Privilegios de tabla. OJO: NO se concede DELETE a authenticated (borrado físico
-- denegado; el "eliminar" del tablero es soft-delete vía UPDATE).
grant select, insert, update on public.bitacora_proyectos to authenticated;

-- Lectura: cualquier usuario autenticado de Datta.
-- (Si más adelante se quiere atar al acceso del dashboard, replicar el patrón de
--  usuario_clientes aquí, en el USING.)
drop policy if exists bitacora_select_authenticated on public.bitacora_proyectos;
create policy bitacora_select_authenticated
  on public.bitacora_proyectos for select
  to authenticated using (true);

-- Insert: autenticados; se sella el autor con el correo del JWT.
drop policy if exists bitacora_insert_authenticated on public.bitacora_proyectos;
create policy bitacora_insert_authenticated
  on public.bitacora_proyectos for insert
  to authenticated
  with check (creado_por = (auth.jwt() ->> 'email'));

-- Update: autenticados (soft-delete y edición). Sin policy de DELETE => DELETE denegado.
drop policy if exists bitacora_update_authenticated on public.bitacora_proyectos;
create policy bitacora_update_authenticated
  on public.bitacora_proyectos for update
  to authenticated using (true) with check (true);

-- (La semilla corre con SERVICE ROLE, que bypassa RLS; por eso puede insertar con
--  creado_por = null en los 57 heredados.)

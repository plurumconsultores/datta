-- =============================================================================
-- permisos_tablero
-- -----------------------------------------------------------------------------
-- Permite restringir lo que un usuario ve DENTRO de un tablero nativo (por
-- ejemplo, su regional o su área), sin necesidad de crear un tablero distinto
-- por cada segmento. La variable de filtrado es libre: cada tablero puede
-- usar el nombre que su HTML espera leer de la URL (?regional=, ?area=, etc.).
--
-- Diseño pensado para no afectar a nadie que no tenga filas aquí:
--   - Si un usuario no tiene ninguna fila para un tablero, no se le aplica
--     ninguna restricción (se comporta exactamente como hoy).
--   - Un usuario puede tener varias filas para el mismo tablero, una por cada
--     variable que se quiera restringir (ej. una fila para "regional" y otra
--     para "proceso").
--
-- IMPORTANTE antes de correr esto en producción:
--   1. Revisa que el nombre de la función is_admin() coincida con la que ya
--      usa el resto del proyecto (se usa en lib/auth.ts vía supabase.rpc).
--      Si tu función de admin se llama distinto, ajusta las políticas abajo.
--   2. Pruébalo primero contra un tablero aislado (como el piloto "Interno"),
--      nunca directo sobre datos de un cliente real.
--   3. Ejecuta esto en el SQL Editor de Supabase (Dashboard -> SQL Editor).
-- =============================================================================

create table if not exists public.permisos_tablero (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  dashboard_id bigint not null references public.dashboards (id) on delete cascade,
  variable     text not null,
  valores      text[] not null,
  created_at   timestamptz not null default now(),
  constraint permisos_tablero_variable_no_vacia check (variable <> ''),
  constraint permisos_tablero_valores_no_vacios check (array_length(valores, 1) > 0),
  unique (user_id, dashboard_id, variable)
);

comment on table public.permisos_tablero is
  'Restringe qué valores de una variable (ej. regional, área) puede ver cada usuario dentro de un tablero nativo. Sin filas = sin restricción.';

alter table public.permisos_tablero enable row level security;

-- Cada usuario puede leer únicamente sus propios permisos (page.tsx consulta
-- esta tabla con la sesión del usuario, no con la llave secreta).
create policy "usuarios leen sus propios permisos"
  on public.permisos_tablero
  for select
  using (user_id = auth.uid());

-- Los administradores gestionan (crear/editar/borrar/leer todo) los permisos
-- de cualquier usuario, igual que ya hacen con dashboards y usuario_clientes.
create policy "admins gestionan todos los permisos"
  on public.permisos_tablero
  for all
  using (is_admin())
  with check (is_admin());

-- Índice de apoyo para la consulta que hace page.tsx (por dashboard_id, ya
-- filtrado además por user_id vía RLS).
create index if not exists permisos_tablero_dashboard_id_idx
  on public.permisos_tablero (dashboard_id);

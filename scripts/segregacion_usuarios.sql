-- Segregación de datos por usuario.
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto de Datta).

-- 1. Variables que declara cada tablero en su propio HTML. Las llena
--    scripts/cargar-tablero.ts al subir el tablero; aquí solo se crea la
--    columna.
alter table public.dashboards
  add column if not exists variables jsonb not null default '[]'::jsonb;

-- 2. Interruptor por usuario: si no requiere segregación, no se aplica ningún
--    límite aunque haya filas guardadas en usuario_limites.
create table if not exists public.usuario_segregacion (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requiere boolean not null default false,
  actualizado_en timestamptz not null default now()
);

-- 3. Un renglón por usuario, tablero y variable. 'valores' son los que SÍ
--    puede ver; sin renglón, la variable no tiene límite.
create table if not exists public.usuario_limites (
  user_id uuid not null references auth.users(id) on delete cascade,
  dashboard_slug text not null,
  variable text not null,
  valores text[] not null default '{}',
  actualizado_en timestamptz not null default now(),
  primary key (user_id, dashboard_slug, variable)
);

create index if not exists usuario_limites_user_idx
  on public.usuario_limites (user_id);

-- 4. RLS: cada quien lee lo suyo (el servidor necesita leerlo para aplicar el
--    límite con la sesión del usuario); el admin lee y escribe todo.
alter table public.usuario_segregacion enable row level security;
alter table public.usuario_limites enable row level security;

drop policy if exists usuario_segregacion_lectura on public.usuario_segregacion;
create policy usuario_segregacion_lectura on public.usuario_segregacion
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists usuario_segregacion_admin on public.usuario_segregacion;
create policy usuario_segregacion_admin on public.usuario_segregacion
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists usuario_limites_lectura on public.usuario_limites;
create policy usuario_limites_lectura on public.usuario_limites
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists usuario_limites_admin on public.usuario_limites;
create policy usuario_limites_admin on public.usuario_limites
  for all using (public.is_admin()) with check (public.is_admin());

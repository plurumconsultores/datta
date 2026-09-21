-- Portal de tableros más amigable — cambios de base de datos.
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto de Datta).

-- 1. Identidad visual de cada cliente: logo, color y qué tan fuerte se
--    difumina ese color detrás de su sección en el portal.
alter table public.clientes
  add column if not exists logo_path text,
  add column if not exists color_hex text,
  add column if not exists color_opacidad smallint not null default 15;

alter table public.clientes drop constraint if exists clientes_color_hex_chk;
alter table public.clientes
  add constraint clientes_color_hex_chk
  check (color_hex is null or color_hex ~* '^#[0-9a-f]{6}$');

alter table public.clientes drop constraint if exists clientes_color_opacidad_chk;
alter table public.clientes
  add constraint clientes_color_opacidad_chk
  check (color_opacidad between 0 and 60);

-- 2. Cuándo se actualizó cada tablero. El trigger la mueve sola en cada
--    update, incluido el de scripts/cargar-tablero.ts.
alter table public.dashboards
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.dashboards_touch_updated_at()
returns trigger
language plpgsql
as $funcion$
begin
  new.updated_at = now();
  return new;
end;
$funcion$;

drop trigger if exists dashboards_set_updated_at on public.dashboards;
create trigger dashboards_set_updated_at
  before update on public.dashboards
  for each row
  execute function public.dashboards_touch_updated_at();

-- 3. Bucket público donde viven los logos. La subida la hace el servidor con
--    la llave secreta (bypasea RLS); la lectura es pública porque el bucket
--    lo es, así que no hacen falta políticas.
insert into storage.buckets (id, name, public)
values ('clientes-logos', 'clientes-logos', true)
on conflict (id) do update set public = true;

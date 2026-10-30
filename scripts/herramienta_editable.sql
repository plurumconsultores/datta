-- =====================================================================
-- Herramientas editables (p. ej. Herramienta de Gestión del Cambio NEXO - Gasco)
-- Estado vivo del tablero + historial de cada cambio (quién, qué, cuándo).
-- Correr UNA vez en Supabase > SQL Editor. Se puede volver a correr sin daño.
-- =====================================================================

create table if not exists public.herramienta_estado (
  slug            text primary key,
  datos           jsonb not null,
  version         integer not null default 1,
  actualizado_en  timestamptz not null default now(),
  actualizado_por text
);

create table if not exists public.herramienta_historial (
  id          bigint generated always as identity primary key,
  slug        text not null,
  lote        uuid not null,
  version     integer not null,
  fecha       timestamptz not null default now(),
  usuario     text,
  usuario_id  uuid,
  nota        text,
  op          text not null check (op in ('set', 'agregar', 'borrar')),
  ruta        jsonb not null,
  seccion     text,
  campo       text,
  antes       jsonb,
  despues     jsonb
);

create index if not exists herramienta_historial_slug_id on public.herramienta_historial (slug, id desc);

-- Sin políticas: nadie las lee ni escribe desde el navegador. Solo el servidor
-- (/api/herramienta/[slug]) con la llave secreta, después de comprobar que el
-- usuario puede ver el tablero.
alter table public.herramienta_estado    enable row level security;
alter table public.herramienta_historial enable row level security;
revoke all on public.herramienta_estado, public.herramienta_historial from anon, authenticated;

-- Guarda el estado y su historial en una sola transacción. Devuelve la versión
-- nueva, o null si otra persona guardó en medio (el servidor reintenta).
create or replace function public.herramienta_guardar(
  p_slug text, p_version integer, p_datos jsonb, p_usuario text,
  p_usuario_id uuid, p_nota text, p_cambios jsonb
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_nueva integer;
  v_lote  uuid := gen_random_uuid();
begin
  if p_version = 0 then
    insert into herramienta_estado (slug, datos, version, actualizado_por)
    values (p_slug, p_datos, 1, p_usuario)
    on conflict (slug) do nothing;
    if not found then return null; end if;
    v_nueva := 1;
  else
    update herramienta_estado
       set datos = p_datos, version = version + 1, actualizado_en = now(), actualizado_por = p_usuario
     where slug = p_slug and version = p_version
    returning version into v_nueva;
    if v_nueva is null then return null; end if;
  end if;

  insert into herramienta_historial (slug, lote, version, usuario, usuario_id, nota, op, ruta, seccion, campo, antes, despues)
  select p_slug, v_lote, v_nueva, p_usuario, p_usuario_id, p_nota,
         c->>'op', c->'ruta', c->>'seccion', c->>'campo', c->'antes', c->'despues'
    from jsonb_array_elements(p_cambios) with ordinality as t(c, n)
   order by n;

  return v_nueva;
end;
$$;

revoke execute on function public.herramienta_guardar(text, integer, jsonb, text, uuid, text, jsonb) from public, anon, authenticated;
grant  execute on function public.herramienta_guardar(text, integer, jsonb, text, uuid, text, jsonb) to service_role;

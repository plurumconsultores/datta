-- Apartado de encuestas en Datta.
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto de Datta).
--
-- La definición de cada encuesta vive en la tabla 'encuestas'. Las respuestas
-- NO: cada encuesta tiene su propia tabla, que Datta crea sola al publicarla
-- con la función crear_tabla_respuestas(). Así los datos de cada cliente
-- quedan separados sin tener que correr SQL a mano cada vez.

create table if not exists public.encuestas (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  titulo        text not null,
  -- clientes.id es bigint en esta base, no uuid.
  cliente_id    bigint references public.clientes(id) on delete set null,
  estado        text not null default 'borrador'
                check (estado in ('borrador', 'publicada', 'cerrada')),
  bienvenida    jsonb not null default '{}'::jsonb,
  preguntas     jsonb not null default '[]'::jsonb,
  tema          jsonb not null default '{}'::jsonb,
  despedida     jsonb not null default '{}'::jsonb,
  /*
   * Mientras se arma, la encuesta es cosa de Plurum. Al activarlo, el cliente
   * ve en Datta su enlace y su QR (nunca el editor ni las respuestas sueltas).
   */
  visible_cliente boolean not null default false,
  tabla_respuestas text,
  -- Tablero de Datta que se alimenta de esta encuesta (su slug), si hay alguno.
  dashboard_slug text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

/*
 * Columnas que se fueron agregando después. El create table de arriba no las
 * añade a una tabla que ya existe, así que se aseguran una por una: gracias a
 * esto el script se puede volver a correr cuantas veces haga falta.
 */
alter table public.encuestas
  add column if not exists tema jsonb not null default '{}'::jsonb,
  add column if not exists visible_cliente boolean not null default false,
  add column if not exists dashboard_slug text,
  add column if not exists tabla_respuestas text,
  add column if not exists cliente_id bigint references public.clientes(id) on delete set null;

-- El slug va en la URL pública (/e/<slug>) y en el nombre de la tabla.
alter table public.encuestas drop constraint if exists encuestas_slug_chk;
alter table public.encuestas
  add constraint encuestas_slug_chk
  check (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$');

alter table public.encuestas enable row level security;

-- Quien no tiene cuenta solo puede leer las encuestas publicadas: es lo que
-- necesita la página pública para dibujarlas.
drop policy if exists encuestas_publicas on public.encuestas;
create policy encuestas_publicas on public.encuestas
  for select to anon using (estado = 'publicada');

/*
 * Quién puede leer la definición de una encuesta:
 *  - el equipo de Plurum (admin o analista), todas;
 *  - un usuario de cliente, solo las de los clientes que tiene asignados.
 * Es la misma regla con la que ve los tableros.
 */
drop policy if exists encuestas_lectura on public.encuestas;
create policy encuestas_lectura on public.encuestas
  for select to authenticated
  using (
    public.puede_ver_todo()
    or (
      -- Un usuario de cliente la ve solo si se la compartieron a propósito.
      visible_cliente
      and cliente_id is not null
      and exists (
        select 1 from public.usuario_clientes uc
        where uc.user_id = auth.uid() and uc.cliente_id = encuestas.cliente_id
      )
    )
  );

-- Las arma el equipo de Plurum: rol admin o analista (eso es puede_ver_todo()).
drop policy if exists encuestas_admin on public.encuestas;
drop policy if exists encuestas_equipo on public.encuestas;
create policy encuestas_equipo on public.encuestas
  for all to authenticated
  using (public.puede_ver_todo()) with check (public.puede_ver_todo());

/*
 * Crea (si no existe) la tabla de respuestas de una encuesta, con su RLS.
 * La llama Datta al publicar. Solo el equipo de Plurum (admin o analista)
 * puede ejecutarla, y el slug se valida antes de armar el nombre: sin eso,
 * esto sería una puerta abierta a inyección de SQL.
 *
 * Las respuestas las inserta el servidor de Datta con la llave secreta, así
 * que la tabla no necesita ninguna política de escritura para 'anon'.
 */
create or replace function public.crear_tabla_respuestas(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $funcion$
declare
  v_tabla text;
begin
  if not public.puede_ver_todo() then
    raise exception 'Solo el equipo de Plurum puede publicar encuestas';
  end if;

  if p_slug !~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$' then
    raise exception 'Slug inválido: %', p_slug;
  end if;

  v_tabla := 'respuestas_' || replace(p_slug, '-', '_');

  execute format(
    'create table if not exists public.%I (
       id         bigint generated always as identity primary key,
       creado_en  timestamptz not null default now(),
       respuestas jsonb not null,
       meta       jsonb not null default ''{}''::jsonb)', v_tabla);

  execute format('alter table public.%I enable row level security', v_tabla);

  /*
   * Las respuestas las lee el equipo de Plurum y los usuarios del cliente
   * dueño de esa encuesta; nadie más, aunque tenga cuenta en Datta. Así un
   * tablero conectado le muestra los datos a su cliente y a nadie ajeno.
   */
  execute format('drop policy if exists respuestas_lectura on public.%I', v_tabla);
  execute format(
    'create policy respuestas_lectura on public.%I
       for select to authenticated
       using (
         public.puede_ver_todo()
         or exists (
           select 1
             from public.encuestas e
             join public.usuario_clientes uc on uc.cliente_id = e.cliente_id
            where e.tabla_respuestas = %L and uc.user_id = auth.uid()
         )
       )', v_tabla, v_tabla);

  -- Borrar respuestas: solo un administrador.
  execute format('drop policy if exists respuestas_borrado on public.%I', v_tabla);
  execute format(
    'create policy respuestas_borrado on public.%I
       for delete to authenticated using (public.is_admin())', v_tabla);

  return v_tabla;
end;
$funcion$;

grant execute on function public.crear_tabla_respuestas(text) to authenticated;

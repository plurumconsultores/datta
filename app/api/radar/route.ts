import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { mapaDeLimites, type LimiteUsuario } from "@/lib/segregacion";

/**
 * API de la base del Radar de mis Estados.
 * La consume el tablero nativo (servido en /d/<slug>/raw, mismo origen),
 * así que las cookies de sesión viajan solas y RLS impone los permisos.
 *
 *  GET            -> { admin, correo, filas, movs }
 *  GET ?resumen=1 -> { admin, resumen }   (lo que consume la carrera)
 *  POST    -> agrega un registro     (solo admin)
 *  PATCH   -> edita un registro      (solo admin)
 *  DELETE  -> borra un registro      (solo admin)
 */

const CAMPOS = "id,creado_en,filial,genero,estado,origen,nota,respuestas";
const CAMPOS_LOG = "id,ocurrido_en,actor_email,accion,registro_id,antes,despues";

/**
 * Columnas de esta base por las que se puede segregar. No se lee de la URL a
 * propósito: el límite lo decide el servidor con lo guardado para el usuario,
 * no lo que diga el tablero.
 */
const VARIABLES_SEGREGABLES = ["filial", "genero", "estado"];

const FILIALES = ["TGI", "Enlaza", "Corporativa"];
const GENEROS = ["Masculino", "Femenino", "Otro"];
const ESTADOS = ["Prisa", "Frustración", "Fatiga", "Complacencia"];

async function contexto() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, admin: false };
  const { data } = await supabase.rpc("es_admin");
  return { supabase, user, admin: data === true };
}

/**
 * Trae TODAS las filas por páginas. PostgREST devuelve como máximo 1.000 por
 * llamada, así que con bases grandes (la feria puede pasar de 1.000 respuestas)
 * una sola consulta se quedaría corta sin avisar.
 */
type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Qué valores puede ver este usuario, según lo configurado en
 * Administración -> Usuarios. Si tiene límites distintos en varios tableros
 * que leen esta base, se aplica el más estricto (la intersección).
 */
async function limitesDelUsuario(
  supabase: Cliente,
  userId: string,
): Promise<Record<string, string[]>> {
  const { data: segregacion } = await supabase
    .from("usuario_segregacion")
    .select("requiere")
    .eq("user_id", userId)
    .maybeSingle<{ requiere: boolean }>();

  if (!segregacion?.requiere) return {};

  const { data } = await supabase
    .from("usuario_limites")
    .select("dashboard_slug, variable, valores")
    .eq("user_id", userId)
    .in("variable", VARIABLES_SEGREGABLES);

  return mapaDeLimites((data ?? []) as LimiteUsuario[]);
}
async function todasLasFilas(
  supabase: Cliente,
  limites: Record<string, string[]> = {},
) {
  const PASO = 1000;
  const TOPE = 50000;
  const filas: Record<string, unknown>[] = [];
  for (let desde = 0; desde < TOPE; desde += PASO) {
    let consulta = supabase
      .from("respuestas_radar")
      .select(CAMPOS)
      .order("id", { ascending: false })
      .range(desde, desde + PASO - 1);

    // El recorte va en la consulta: las filas prohibidas nunca salen de la base.
    for (const variable of VARIABLES_SEGREGABLES) {
      const permitidos = limites[variable];
      if (permitidos && permitidos.length > 0) {
        consulta = consulta.in(variable, permitidos);
      }
    }

    const { data, error } = await consulta;
    if (error || !data || data.length === 0) break;
    filas.push(...data);
    if (data.length < PASO) break;
  }
  return filas;
}

export async function GET(request: Request) {
  const { supabase, user, admin } = await contexto();
  if (!user) return NextResponse.json({ admin: false }, { status: 401 });

  const limites = await limitesDelUsuario(supabase, user.id);
  const limitado = Object.keys(limites).length > 0;

  // ?resumen=1 -> solo los conteos que dibuja la carrera (sin datos individuales).
  // Así el tablero no necesita llevar llaves de Supabase dentro del HTML.
  if (new URL(request.url).searchParams.has("resumen")) {
    // La función radar_resumen cuenta sobre TODA la base, así que a un usuario
    // con límites le filtraría nada: mejor no devolverle conteos que no le
    // corresponden. Queda pendiente una versión de la función que reciba el
    // recorte.
    if (limitado) {
      return NextResponse.json({ admin, resumen: null, limitado: true });
    }
    const { data } = await supabase.rpc("radar_resumen");
    return NextResponse.json({ admin, resumen: data ?? {} });
  }

  const filas = await todasLasFilas(supabase, limites);

  // El historial guarda los registros completos en antes/despues, así que a un
  // usuario con límites no se le manda: dejaría ver lo que el recorte esconde.
  const { data: movs } = limitado
    ? { data: [] as Record<string, unknown>[] }
    : await supabase
        .from("respuestas_radar_log")
        .select(CAMPOS_LOG)
        .order("id", { ascending: false })
        .limit(1000);

  return NextResponse.json({
    admin,
    correo: user.email,
    limites,
    filas: filas ?? [],
    movs: movs ?? [],
  });
}

export async function POST(request: Request) {
  const { supabase, user, admin } = await contexto();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Requiere rol admin" }, { status: 403 });

  const body = await request.json();
  if (!FILIALES.includes(body.filial)) return malo("Filial inválida");
  if (body.genero && !GENEROS.includes(body.genero)) return malo("Género inválido");
  if (!ESTADOS.includes(body.estado)) return malo("Estado inválido");

  const { error } = await supabase.from("respuestas_radar").insert({
    filial: body.filial,
    genero: body.genero ?? null,
    estado: body.estado,
    origen: "papel",
    nota: body.nota || null,
    respuestas: { origen: "papel", capturado_en: "tablero" },
  });
  if (error) return malo(error.message, 400);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { supabase, user, admin } = await contexto();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Requiere rol admin" }, { status: 403 });

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return malo("Falta el id");

  const cambio: Record<string, string | null> = {};
  if ("filial" in body) {
    if (!FILIALES.includes(body.filial)) return malo("Filial inválida");
    cambio.filial = body.filial;
  }
  if ("genero" in body) {
    if (body.genero && !GENEROS.includes(body.genero)) return malo("Género inválido");
    cambio.genero = body.genero || null;
  }
  if ("estado" in body) {
    if (!ESTADOS.includes(body.estado)) return malo("Estado inválido");
    cambio.estado = body.estado;
  }
  if ("nota" in body) cambio.nota = body.nota || null;
  if (Object.keys(cambio).length === 0) return malo("Nada que cambiar");

  const { error } = await supabase.from("respuestas_radar").update(cambio).eq("id", id);
  if (error) return malo(error.message, 400);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user, admin } = await contexto();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Requiere rol admin" }, { status: 403 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return malo("Falta el id");

  const { error } = await supabase.from("respuestas_radar").delete().eq("id", id);
  if (error) return malo(error.message, 400);
  return NextResponse.json({ ok: true });
}

function malo(mensaje: string, estado = 422) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

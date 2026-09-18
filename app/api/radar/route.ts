import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

const CAMPOS = "id,creado_en,filial,genero,estado,origen,nota";
const CAMPOS_LOG = "id,ocurrido_en,actor_email,accion,registro_id,antes,despues";

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

export async function GET(request: Request) {
  const { supabase, user, admin } = await contexto();
  if (!user) return NextResponse.json({ admin: false }, { status: 401 });

  // ?resumen=1 -> solo los conteos que dibuja la carrera (sin datos individuales).
  // Así el tablero no necesita llevar llaves de Supabase dentro del HTML.
  if (new URL(request.url).searchParams.has("resumen")) {
    const { data } = await supabase.rpc("radar_resumen");
    return NextResponse.json({ admin, resumen: data ?? {} });
  }

  const { data: filas } = await supabase
    .from("respuestas_radar")
    .select(CAMPOS)
    .order("id", { ascending: false })
    .limit(500);

  const { data: movs } = await supabase
    .from("respuestas_radar_log")
    .select(CAMPOS_LOG)
    .order("id", { ascending: false })
    .limit(200);

  return NextResponse.json({
    admin,
    correo: user.email,
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

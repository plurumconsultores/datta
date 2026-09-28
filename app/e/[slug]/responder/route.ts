import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizarPreguntas,
  respuestaValida,
  tablaDe,
} from "@/lib/encuestas";

/*
 * Recibe una respuesta de la encuesta pública. Ruta bajo /e/, sin sesión.
 *
 * Nada de lo que llega del navegador se guarda tal cual: se comprueba contra
 * la definición de la encuesta y solo se aceptan valores que existen en ella.
 * La inserción la hace el servidor con la llave secreta, así que la tabla de
 * respuestas no necesita ninguna política de escritura abierta.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const enviadas = (cuerpo as { respuestas?: unknown })?.respuestas;
  if (typeof enviadas !== "object" || enviadas === null) {
    return NextResponse.json({ error: "Faltan las respuestas" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: encuesta } = await admin
    .from("encuestas")
    .select("slug, estado, preguntas, tabla_respuestas")
    .eq("slug", slug)
    .maybeSingle<{
      slug: string;
      estado: string;
      preguntas: unknown;
      tabla_respuestas: string | null;
    }>();

  if (!encuesta || encuesta.estado !== "publicada") {
    return NextResponse.json({ error: "La encuesta no está abierta" }, { status: 404 });
  }

  const preguntas = normalizarPreguntas(encuesta.preguntas);
  const limpias: Record<string, unknown> = {};

  for (const pregunta of preguntas) {
    const valor = (enviadas as Record<string, unknown>)[pregunta.id];
    if (!respuestaValida(pregunta, valor)) {
      return NextResponse.json(
        { error: `Respuesta inválida en "${pregunta.texto}"` },
        { status: 422 },
      );
    }
    if (valor !== undefined && valor !== null && valor !== "") {
      limpias[pregunta.id] = valor;
    }
  }

  const tabla = encuesta.tabla_respuestas ?? tablaDe(encuesta.slug);

  const { error } = await admin.from(tabla).insert({
    respuestas: limpias,
    // Sin IP ni nada que identifique: la encuesta se ofrece como anónima.
    meta: { version_preguntas: preguntas.length, enviado_en: new Date().toISOString() },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

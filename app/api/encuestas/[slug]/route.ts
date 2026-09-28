import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizarPreguntas,
  preguntasReales,
  tablaDe,
  type Pregunta,
} from "@/lib/encuestas";

/**
 * Los datos de una encuesta para el tablero que la tiene conectada.
 *
 * Se sirve en el mismo origen que Datta, así que la cookie de sesión viaja
 * sola desde el iframe del tablero y RLS impone los permisos: el tablero nunca
 * lleva una llave de Supabase dentro.
 *
 *   GET            -> { encuesta, preguntas, filas }
 *   GET ?resumen=1 -> { encuesta, preguntas, total, resumen }  (sin respuestas sueltas)
 */

const PASO = 1000;
const TOPE = 50000;

type Fila = { id: number; creado_en: string; respuestas: Record<string, unknown> };

async function todasLasFilas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabla: string,
) {
  const filas: Fila[] = [];

  // Por páginas: PostgREST devuelve máximo 1.000 filas por llamada y, pasado
  // ese número, una sola consulta se queda corta sin avisar.
  for (let desde = 0; desde < TOPE; desde += PASO) {
    const { data, error } = await supabase
      .from(tabla)
      .select("id, creado_en, respuestas")
      .order("id", { ascending: true })
      .range(desde, desde + PASO - 1);

    if (error || !data || data.length === 0) break;
    filas.push(...(data as Fila[]));
    if (data.length < PASO) break;
  }

  return filas;
}

/** Conteos por pregunta; para escalas, además el promedio. */
function resumir(preguntas: Pregunta[], filas: Fila[]) {
  return preguntas.map((pregunta) => {
    const conteo: Record<string, number> = {};
    let suma = 0;
    let respondidas = 0;

    for (const fila of filas) {
      const valor = fila.respuestas?.[pregunta.id];
      if (valor === undefined || valor === null || valor === "") continue;

      respondidas += 1;

      // El texto abierto no se agrupa: se cuenta cuántos respondieron y ya.
      if (pregunta.tipo === "texto") continue;

      if (Array.isArray(valor)) {
        for (const v of valor) conteo[String(v)] = (conteo[String(v)] ?? 0) + 1;
        continue;
      }

      conteo[String(valor)] = (conteo[String(valor)] ?? 0) + 1;
      if (pregunta.tipo === "escala") suma += Number(valor) || 0;
    }

    return {
      id: pregunta.id,
      texto: pregunta.texto,
      tipo: pregunta.tipo,
      respondidas,
      conteo,
      promedio:
        pregunta.tipo === "escala" && respondidas > 0
          ? Number((suma / respondidas).toFixed(2))
          : null,
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  const { data: encuesta } = await supabase
    .from("encuestas")
    .select("slug, titulo, estado, preguntas, tabla_respuestas")
    .eq("slug", slug)
    .maybeSingle<{
      slug: string;
      titulo: string;
      estado: string;
      preguntas: unknown;
      tabla_respuestas: string | null;
    }>();

  if (!encuesta) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Los bloques de descripción no se responden: no son datos para el tablero.
  const preguntas = preguntasReales(normalizarPreguntas(encuesta.preguntas));
  const tabla = encuesta.tabla_respuestas ?? tablaDe(encuesta.slug);
  const filas = await todasLasFilas(supabase, tabla);

  const cabecera = {
    encuesta: { slug: encuesta.slug, titulo: encuesta.titulo, estado: encuesta.estado },
    preguntas: preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      opciones: p.opciones,
      escala: p.escala,
    })),
    total: filas.length,
  };

  if (new URL(request.url).searchParams.has("resumen")) {
    return NextResponse.json({ ...cabecera, resumen: resumir(preguntas, filas) });
  }

  return NextResponse.json({ ...cabecera, filas });
}

import { requireEquipo } from "@/lib/auth";
import { normalizarPreguntas, tablaDe } from "@/lib/encuestas";

const PASO = 1000;
const TOPE = 100000;

/** Un campo listo para CSV: comillas dobladas y entrecomillado si hace falta. */
function campo(valor: unknown): string {
  const texto =
    valor === null || valor === undefined
      ? ""
      : Array.isArray(valor)
        ? valor.join(" | ")
        : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/*
 * Descarga de todas las respuestas. Separador ';' y BOM al inicio: así Excel
 * en español abre el archivo con las columnas separadas y sin romper tildes.
 * Se pide por páginas porque PostgREST devuelve máximo 1.000 filas por
 * llamada y, pasado ese número, se perderían respuestas sin ningún aviso.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireEquipo();

  const { data: encuesta } = await supabase
    .from("encuestas")
    .select("slug, titulo, preguntas, tabla_respuestas")
    .eq("id", id)
    .single<{
      slug: string;
      titulo: string;
      preguntas: unknown;
      tabla_respuestas: string | null;
    }>();

  if (!encuesta) {
    return new Response("No encontrada", { status: 404 });
  }

  const preguntas = normalizarPreguntas(encuesta.preguntas);
  const tabla = encuesta.tabla_respuestas ?? tablaDe(encuesta.slug);

  const filas: { id: number; creado_en: string; respuestas: Record<string, unknown> }[] =
    [];

  for (let desde = 0; desde < TOPE; desde += PASO) {
    const { data, error } = await supabase
      .from(tabla)
      .select("id, creado_en, respuestas")
      .order("id", { ascending: true })
      .range(desde, desde + PASO - 1);

    if (error || !data || data.length === 0) break;
    filas.push(...(data as typeof filas));
    if (data.length < PASO) break;
  }

  const cabecera = ["id", "fecha", ...preguntas.map((p) => p.texto || p.id)];
  const lineas = [cabecera.map(campo).join(";")];

  for (const fila of filas) {
    const fecha = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(fila.creado_en));

    lineas.push(
      [
        campo(fila.id),
        campo(fecha),
        ...preguntas.map((p) => campo(fila.respuestas?.[p.id])),
      ].join(";"),
    );
  }

  const csv = "﻿" + lineas.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encuesta.slug}.csv"`,
    },
  });
}

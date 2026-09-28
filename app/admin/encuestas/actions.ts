"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEquipo } from "@/lib/auth";
import {
  BIENVENIDA_POR_DEFECTO,
  DESPEDIDA_POR_DEFECTO,
  TEMA_POR_DEFECTO,
  aSlug,
  normalizarBienvenida,
  normalizarDespedida,
  normalizarPreguntas,
  normalizarTema,
  opcionesPosibles,
  preguntasReales,
  slugValido,
  type Bienvenida,
  type Despedida,
  type Pregunta,
  type Tema,
} from "@/lib/encuestas";

const PATH = "/admin/encuestas";

function fallar(mensaje: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(mensaje)}`);
}

export async function crearEncuesta(formData: FormData) {
  const { supabase } = await requireEquipo();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const slugPedido = String(formData.get("slug") ?? "").trim();
  const clienteId = String(formData.get("cliente_id") ?? "").trim();

  if (!titulo) {
    fallar("El título es obligatorio.");
  }

  const slug = aSlug(slugPedido || titulo);
  if (!slugValido(slug)) {
    fallar("La dirección web no es válida: usa letras, números y guiones.");
  }

  const { data, error } = await supabase
    .from("encuestas")
    .insert({
      titulo,
      slug,
      // clientes.id es numérico: el formulario lo trae como texto.
      cliente_id: clienteId === "" ? null : Number(clienteId),
      estado: "borrador",
      bienvenida: BIENVENIDA_POR_DEFECTO,
      despedida: DESPEDIDA_POR_DEFECTO,
      tema: TEMA_POR_DEFECTO,
      preguntas: [],
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    fallar(
      error.message.includes("duplicate")
        ? `Ya existe una encuesta con la dirección "${slug}".`
        : error.message,
    );
  }

  revalidatePath(PATH);
  redirect(`${PATH}/${data!.id}`);
}

/**
 * Guarda la definición completa. La llama el editor cada vez que cambias algo,
 * así no hay que acordarse de darle a un botón.
 */
export async function guardarEncuesta(
  id: string,
  definicion: {
    titulo: string;
    cliente_id: string | null;
    bienvenida: Bienvenida;
    preguntas: Pregunta[];
    despedida: Despedida;
    tema: Tema;
  },
) {
  const { supabase } = await requireEquipo();

  const titulo = definicion.titulo.trim();
  if (!titulo) throw new Error("El título no puede quedar vacío.");

  const { error } = await supabase
    .from("encuestas")
    .update({
      titulo,
      cliente_id:
        definicion.cliente_id === null || definicion.cliente_id === ""
          ? null
          : Number(definicion.cliente_id),
      bienvenida: normalizarBienvenida(definicion.bienvenida),
      preguntas: normalizarPreguntas(definicion.preguntas),
      despedida: normalizarDespedida(definicion.despedida),
      tema: normalizarTema(definicion.tema),
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${id}`);
}

/**
 * Publica: crea la tabla de respuestas (si no existe) y abre la encuesta.
 * La tabla la arma una función de Supabase, que valida el slug y exige rol
 * admin; desde aquí no se construye ningún SQL.
 */
export async function publicarEncuesta(id: string) {
  const { supabase } = await requireEquipo();

  const { data: encuesta, error: lectura } = await supabase
    .from("encuestas")
    .select("slug, preguntas")
    .eq("id", id)
    .single<{ slug: string; preguntas: unknown }>();

  if (lectura || !encuesta) throw new Error(lectura?.message ?? "No se encontró la encuesta.");

  const preguntas = normalizarPreguntas(encuesta.preguntas);
  if (preguntasReales(preguntas).length === 0) {
    throw new Error("Agrega al menos una pregunta antes de publicar.");
  }

  const bloqueVacio = preguntas.find(
    (p) => p.tipo === "nota" && !p.texto.trim() && !p.descripcion.trim(),
  );
  if (bloqueVacio) {
    throw new Error("Hay un bloque de descripción sin texto: escríbelo o quítalo.");
  }

  const sinTexto = preguntasReales(preguntas).find((p) => !p.texto.trim());
  if (sinTexto) throw new Error("Hay una pregunta sin texto.");

  const sinOpciones = preguntasReales(preguntas).find(
    (p) =>
      p.tipo !== "escala" && p.tipo !== "texto" && opcionesPosibles(p).length < 2,
  );
  if (sinOpciones) {
    throw new Error(`"${sinOpciones.texto}" necesita al menos dos opciones.`);
  }

  /*
   * Una regla solo puede mirar hacia atrás: si apunta a una pregunta que va
   * después (o que ya no existe), nunca se cumpliría y la pregunta quedaría
   * invisible sin que nadie se enterara.
   */
  const previas = new Set<string>();
  for (const pregunta of preguntas) {
    const nombre = pregunta.texto.trim() || pregunta.id;

    if (pregunta.condicion && !previas.has(pregunta.condicion.pregunta)) {
      throw new Error(
        `La condición de "${nombre}" apunta a una pregunta que no va antes que ella. Muévela o cambia la condición.`,
      );
    }
    if (pregunta.opcionesSegun && !previas.has(pregunta.opcionesSegun.pregunta)) {
      throw new Error(
        `Las opciones de "${nombre}" dependen de una pregunta que no va antes que ella. Muévela o cambia la regla.`,
      );
    }

    if (pregunta.tipo !== "nota") previas.add(pregunta.id);
  }

  const { data: tabla, error: rpc } = await supabase.rpc("crear_tabla_respuestas", {
    p_slug: encuesta.slug,
  });
  if (rpc) throw new Error(rpc.message);

  const { error } = await supabase
    .from("encuestas")
    .update({
      estado: "publicada",
      tabla_respuestas: tabla,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${id}`);
  revalidatePath(PATH);
}

/** Cierra la encuesta: el enlace deja de recibir respuestas. */
export async function cambiarEstado(id: string, estado: "publicada" | "cerrada") {
  const { supabase } = await requireEquipo();

  const { error } = await supabase
    .from("encuestas")
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${id}`);
  revalidatePath(PATH);
}

/**
 * Borra la definición de la encuesta. La tabla de respuestas NO se toca: las
 * respuestas ya recogidas se quedan en Supabase.
 */
export async function eliminarEncuesta(formData: FormData) {
  const { supabase } = await requireEquipo();

  const id = String(formData.get("id") ?? "");
  if (!id) fallar("Falta el id de la encuesta.");

  const { error } = await supabase.from("encuestas").delete().eq("id", id);
  if (error) fallar(error.message);

  revalidatePath(PATH);
  redirect(PATH);
}


/**
 * Conecta (o desconecta) la encuesta con un tablero de Datta. Solo guarda el
 * slug: quien decide qué se ve sigue siendo el tablero, y los permisos los
 * sigue imponiendo RLS con la sesión de quien lo abre.
 */
export async function conectarTablero(id: string, dashboardSlug: string | null) {
  const { supabase } = await requireEquipo();

  if (dashboardSlug) {
    const { data: tablero } = await supabase
      .from("dashboards")
      .select("slug")
      .eq("slug", dashboardSlug)
      .maybeSingle<{ slug: string }>();

    if (!tablero) throw new Error("Ese tablero ya no existe.");
  }

  const { error } = await supabase
    .from("encuestas")
    .update({ dashboard_slug: dashboardSlug, actualizado_en: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${id}`);
}


/**
 * Comparte (o deja de compartir) la encuesta con el cliente. Compartida, el
 * cliente ve en Datta su enlace y su QR; nunca el editor ni las respuestas
 * una por una.
 */
export async function mostrarAlCliente(id: string, visible: boolean) {
  const { supabase } = await requireEquipo();

  if (visible) {
    const { data: encuesta } = await supabase
      .from("encuestas")
      .select("cliente_id, estado")
      .eq("id", id)
      .single<{ cliente_id: number | null; estado: string }>();

    if (!encuesta?.cliente_id) {
      throw new Error(
        "Esta encuesta es interna: asígnale un cliente antes de compartirla.",
      );
    }
    if (encuesta.estado === "borrador") {
      throw new Error("Publícala primero: en borrador todavía no tiene enlace.");
    }
  }

  const { error } = await supabase
    .from("encuestas")
    .update({ visible_cliente: visible, actualizado_en: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${id}`);
  revalidatePath("/encuestas");
}

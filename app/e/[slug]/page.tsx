import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlLogo } from "@/lib/clientes";
import {
  normalizarBienvenida,
  normalizarDespedida,
  normalizarPreguntas,
  normalizarTema,
} from "@/lib/encuestas";
import { EncuestaPublica } from "./EncuestaPublica";

/*
 * Página pública de una encuesta. Cuelga de /e/, que proxy.ts deja pasar sin
 * sesión. Se lee con la llave secreta del servidor —nunca llega al navegador—
 * y se comprueba aquí que la encuesta esté publicada.
 */

type Fila = {
  id: string;
  slug: string;
  titulo: string;
  estado: string;
  cliente_id: string | null;
  bienvenida: unknown;
  preguntas: unknown;
  despedida: unknown;
  tema: unknown;
};

async function traerEncuesta(slug: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("encuestas")
    .select("id, slug, titulo, estado, cliente_id, bienvenida, preguntas, despedida, tema")
    .eq("slug", slug)
    .maybeSingle<Fila>();

  if (!data) return null;

  let cliente: { nombre: string; logo_path: string | null } | null = null;
  if (data.cliente_id) {
    const { data: c } = await admin
      .from("clientes")
      .select("nombre, logo_path")
      .eq("id", data.cliente_id)
      .maybeSingle<{ nombre: string; logo_path: string | null }>();
    cliente = c ?? null;
  }

  return {
    estado: data.estado,
    titulo: data.titulo,
    slug: data.slug,
    bienvenida: normalizarBienvenida(data.bienvenida),
    preguntas: normalizarPreguntas(data.preguntas),
    despedida: normalizarDespedida(data.despedida),
    tema: normalizarTema(data.tema),
    clienteNombre: cliente?.nombre ?? null,
    clienteLogo: urlLogo(cliente?.logo_path),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const encuesta = await traerEncuesta(slug);
  return { title: encuesta?.titulo ?? "Encuesta" };
}

export default async function PaginaEncuesta({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const encuesta = await traerEncuesta(slug);

  // Enlace inventado o encuesta borrada.
  if (!encuesta) {
    return (
      <Aviso
        titulo="Esta encuesta no existe"
        texto="Revisa el enlace: puede estar incompleto o mal copiado. Si crees que es un error, escríbele a quien te lo compartió."
      />
    );
  }

  // Cerrada: el enlace sigue vivo pero ya no recibe respuestas.
  if (encuesta.estado !== "publicada") {
    return (
      <Aviso
        titulo="Esta encuesta ya está cerrada"
        texto="El periodo para responderla terminó, así que no se están recibiendo más respuestas. Gracias por tu interés."
        tema={encuesta.tema}
        logo={encuesta.clienteLogo}
        nombre={encuesta.clienteNombre}
        pie={encuesta.titulo}
      />
    );
  }

  return <EncuestaPublica encuesta={encuesta} />;
}

/** Pantalla simple para los casos en que no hay encuesta que responder. */
function Aviso({
  titulo,
  texto,
  tema,
  logo,
  nombre,
  pie,
}: {
  titulo: string;
  texto: string;
  tema?: { principal: string; fondo: string; texto: string };
  logo?: string | null;
  nombre?: string | null;
  pie?: string;
}) {
  const colores = tema ?? { principal: "#487629", fondo: "#F2F5EE", texto: "#1B2A17" };

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: colores.fondo, color: colores.texto }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: colores.principal }} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8">
        <header className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={nombre ?? ""}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <span className="text-sm font-semibold opacity-70">{nombre ?? "Plurum"}</span>
          )}
        </header>

        <section className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{titulo}</h1>
          <p className="text-lg leading-relaxed opacity-80">{texto}</p>
        </section>

        {pie && <footer className="pt-6 text-xs opacity-50">{pie} · Plurum</footer>}
      </div>
    </main>
  );
}

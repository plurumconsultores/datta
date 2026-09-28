import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireEquipo } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "../../AdminTabs";
import { EditorEncuesta } from "./EditorEncuesta";
import { CompartirEncuesta } from "./CompartirEncuesta";
import { ConexionTablero, type TableroDisponible } from "./ConexionTablero";
import { eliminarEncuesta } from "../actions";
import { qrDeUrl, urlPublica } from "@/lib/qr";
import {
  normalizarBienvenida,
  normalizarDespedida,
  normalizarPreguntas,
  normalizarTema,
  normalizarVariablesTablero,
  tablaDe,
  type Encuesta,
} from "@/lib/encuestas";

type Fila = {
  id: string;
  slug: string;
  titulo: string;
  cliente_id: string | number | null;
  estado: "borrador" | "publicada" | "cerrada";
  bienvenida: unknown;
  preguntas: unknown;
  despedida: unknown;
  tema: unknown;
  tabla_respuestas: string | null;
  visible_cliente: boolean;
  dashboard_slug: string | null;
};

export default async function EncuestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await requireEquipo();

  const { data } = await supabase
    .from("encuestas")
    .select(
      "id, slug, titulo, cliente_id, estado, bienvenida, preguntas, despedida, tema, tabla_respuestas, visible_cliente, dashboard_slug",
    )
    .eq("id", id)
    .single<Fila>();

  if (!data) {
    notFound();
  }

  const encuesta: Encuesta = {
    id: data.id,
    slug: data.slug,
    titulo: data.titulo,
    cliente_id: data.cliente_id === null ? null : String(data.cliente_id),
    estado: data.estado,
    bienvenida: normalizarBienvenida(data.bienvenida),
    preguntas: normalizarPreguntas(data.preguntas),
    despedida: normalizarDespedida(data.despedida),
    tema: normalizarTema(data.tema),
    tabla_respuestas: data.tabla_respuestas,
    visible_cliente: data.visible_cliente,
    dashboard_slug: data.dashboard_slug,
  };

  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nombre, color_hex")
    .order("nombre");

  // Cuántas respuestas lleva, si ya tiene tabla.
  let respuestas: number | null = null;
  if (encuesta.estado !== "borrador") {
    const { count } = await supabase
      .from(encuesta.tabla_respuestas ?? tablaDe(encuesta.slug))
      .select("id", { count: "exact", head: true });
    respuestas = count ?? 0;
  }

  // Tableros a los que se puede conectar, con las variables que declaran.
  const { data: tablerosData } = await supabase
    .from("dashboards")
    .select("slug, title, variables")
    .eq("is_active", true)
    .order("title");

  const tableros: TableroDisponible[] = (
    (tablerosData ?? []) as { slug: string; title: string; variables: unknown }[]
  ).map((t) => ({
    slug: t.slug,
    title: t.title,
    variables: normalizarVariablesTablero(t.variables),
  }));

  const cabeceras = await headers();
  const url = urlPublica(
    cabeceras.get("host"),
    cabeceras.get("x-forwarded-proto"),
    encuesta.slug,
  );
  const qr = await qrDeUrl(url);

  return (
    <AppShell
      title={encuesta.titulo}
      active="encuestas"
      isAdmin={isAdmin}
      esEquipo
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
        {isAdmin && <AdminTabs active="encuestas" />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/encuestas"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            ← Todas las encuestas
          </Link>

          {respuestas !== null && (
            <Link
              href={`/admin/encuestas/${encuesta.id}/respuestas`}
              className="rounded-md border border-brand-700 px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
            >
              Ver respuestas ({respuestas})
            </Link>
          )}
        </div>

        {encuesta.estado !== "borrador" && (
          <CompartirEncuesta
            encuestaId={encuesta.id}
            url={url}
            qr={qr}
            slug={encuesta.slug}
            activa={encuesta.estado === "publicada"}
            esInterna={encuesta.cliente_id === null}
            visibleInicial={encuesta.visible_cliente}
          />
        )}

        <ConexionTablero
          encuestaId={encuesta.id}
          preguntas={encuesta.preguntas}
          tableros={tableros}
          conectadoInicial={encuesta.dashboard_slug}
        />

        <EditorEncuesta
          encuesta={encuesta}
          clientes={(
            (clientesData ?? []) as {
              id: string | number;
              nombre: string;
              color_hex: string | null;
            }[]
          ).map((c) => ({ ...c, id: String(c.id) }))}
        />

        <section className="flex flex-col gap-3 border-t border-ink/10 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Eliminar
          </h2>
          <form action={eliminarEncuesta} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={encuesta.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Eliminar la encuesta
            </button>
            <span className="text-xs text-muted">
              Borra la encuesta y su enlace. Las respuestas ya recogidas se quedan en
              Supabase, en la tabla{" "}
              <code className="font-mono">{tablaDe(encuesta.slug)}</code>.
            </span>
          </form>
        </section>
      </main>
    </AppShell>
  );
}

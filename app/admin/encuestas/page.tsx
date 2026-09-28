import Link from "next/link";
import { requireEquipo } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "../AdminTabs";
import { crearEncuesta } from "./actions";
import { normalizarPreguntas } from "@/lib/encuestas";

type EncuestaFila = {
  id: string;
  slug: string;
  titulo: string;
  estado: "borrador" | "publicada" | "cerrada";
  cliente_id: string | number | null;
  preguntas: unknown;
  actualizado_en: string;
};

type Cliente = { id: string | number; nombre: string };

const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";
const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";

const ESTADO_ESTILO: Record<EncuestaFila["estado"], string> = {
  borrador: "border border-ink/20 text-muted",
  publicada: "bg-brand-900 text-white",
  cerrada: "border border-ink/20 bg-page text-ink",
};

const ESTADO_TEXTO: Record<EncuestaFila["estado"], string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  cerrada: "Cerrada",
};

export default async function EncuestasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user, isAdmin } = await requireEquipo();
  const { error } = await searchParams;

  const consulta = await supabase
    .from("encuestas")
    .select("id, slug, titulo, estado, cliente_id, preguntas, actualizado_en")
    .order("actualizado_en", { ascending: false });

  const faltaSql = Boolean(consulta.error);
  const encuestas = (consulta.data ?? []) as EncuestaFila[];

  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nombre")
    .order("nombre");
  const clientes = (clientesData ?? []) as Cliente[];
  const nombrePorCliente = new Map(clientes.map((c) => [String(c.id), c.nombre]));

  return (
    <AppShell
      title="Encuestas"
      active="encuestas"
      isAdmin={isAdmin}
      esEquipo
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
        {isAdmin && <AdminTabs active="encuestas" />}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {faltaSql && (
          <p
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Falta correr <code>scripts/encuestas.sql</code> en Supabase: todavía no se
            pueden crear encuestas.
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Crear encuesta
          </h2>
          <div className={cardClass}>
            <form action={crearEncuesta} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                  Título
                  <input
                    name="titulo"
                    required
                    placeholder="Encuesta de clima 2026"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                  Cliente
                  <select name="cliente_id" defaultValue="" className={inputClass}>
                    <option value="">Interno</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Dirección web <span className="font-normal text-muted">(opcional)</span>
                <input
                  name="slug"
                  placeholder="clima-2026"
                  className={`${inputClass} font-mono`}
                />
                <span className="text-xs font-normal text-muted">
                  Es lo que va después de /e/ en el enlace. Si lo dejas vacío se arma
                  con el título. No se puede cambiar después de publicar.
                </span>
              </label>

              <button
                type="submit"
                className="w-fit rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Crear y abrir el editor
              </button>
            </form>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Encuestas ({encuestas.length})
          </h2>

          {encuestas.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay encuestas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {encuestas.map((encuesta) => {
                const preguntas = normalizarPreguntas(encuesta.preguntas);
                const cliente = encuesta.cliente_id
                  ? nombrePorCliente.get(String(encuesta.cliente_id))
                  : "Interno";

                return (
                  <Link
                    key={encuesta.id}
                    href={`/admin/encuestas/${encuesta.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-surface px-5 py-4 shadow-sm transition-colors hover:border-brand-400"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-medium text-ink">{encuesta.titulo}</p>
                      <p className="text-xs text-muted">
                        {cliente} · /e/{encuesta.slug} ·{" "}
                        {preguntas.length === 1
                          ? "1 pregunta"
                          : `${preguntas.length} preguntas`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_ESTILO[encuesta.estado]}`}
                    >
                      {ESTADO_TEXTO[encuesta.estado]}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

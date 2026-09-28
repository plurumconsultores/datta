import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEquipo } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "../../../AdminTabs";
import {
  normalizarPreguntas,
  preguntasReales,
  tablaDe,
  type Pregunta,
} from "@/lib/encuestas";

const TOPE = 200;

type Fila = { id: number; creado_en: string; respuestas: Record<string, unknown> };

/** Una respuesta guardada, en texto para la tabla. */
function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (Array.isArray(valor)) return valor.join(", ");
  return String(valor);
}

export default async function RespuestasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await requireEquipo();

  const { data: encuesta } = await supabase
    .from("encuestas")
    .select("id, slug, titulo, estado, preguntas, tabla_respuestas")
    .eq("id", id)
    .single<{
      id: string;
      slug: string;
      titulo: string;
      estado: string;
      preguntas: unknown;
      tabla_respuestas: string | null;
    }>();

  if (!encuesta) notFound();

  const preguntas: Pregunta[] = preguntasReales(
    normalizarPreguntas(encuesta.preguntas),
  );
  const tabla = encuesta.tabla_respuestas ?? tablaDe(encuesta.slug);

  const { count } = await supabase
    .from(tabla)
    .select("id", { count: "exact", head: true });

  const { data: filasData } = await supabase
    .from(tabla)
    .select("id, creado_en, respuestas")
    .order("id", { ascending: false })
    .limit(TOPE);

  const filas = (filasData ?? []) as Fila[];
  const total = count ?? 0;

  return (
    <AppShell
      title={encuesta.titulo}
      active="encuestas"
      isAdmin={isAdmin}
      esEquipo
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        {isAdmin && <AdminTabs active="encuestas" />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/encuestas/${encuesta.id}`}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            ← Volver al editor
          </Link>
          <a
            href={`/admin/encuestas/${encuesta.id}/respuestas/csv`}
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Descargar todo en CSV
          </a>
        </div>

        <section className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-ink/10 bg-surface px-5 py-4 shadow-sm">
            <p className="text-3xl font-semibold tabular-nums text-ink">{total}</p>
            <p className="text-sm text-muted">
              {total === 1 ? "respuesta recibida" : "respuestas recibidas"}
            </p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-surface px-5 py-4 shadow-sm">
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {preguntas.length}
            </p>
            <p className="text-sm text-muted">preguntas</p>
          </div>
        </section>

        {total === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
            Todavía no llega ninguna respuesta.
          </p>
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Últimas {Math.min(total, TOPE)} respuestas
            </h2>

            <div className="overflow-x-auto rounded-xl border border-ink/10 bg-surface shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left">
                    <th className="px-4 py-3 font-semibold text-ink">Fecha</th>
                    {preguntas.map((pregunta) => (
                      <th
                        key={pregunta.id}
                        className="px-4 py-3 font-semibold text-ink"
                      >
                        {pregunta.texto || pregunta.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.id} className="border-b border-ink/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {new Intl.DateTimeFormat("es-CO", {
                          timeZone: "America/Bogota",
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(fila.creado_en))}
                      </td>
                      {preguntas.map((pregunta) => (
                        <td key={pregunta.id} className="px-4 py-3 text-ink">
                          {comoTexto(fila.respuestas?.[pregunta.id])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > TOPE && (
              <p className="text-xs text-muted">
                Se muestran las {TOPE} más recientes. El CSV trae todas.
              </p>
            )}
          </section>
        )}
      </main>
    </AppShell>
  );
}

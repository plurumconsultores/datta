import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "../AdminTabs";
import { createCliente, updateCliente, setClienteActivo } from "./actions";
import { IdentidadCliente } from "./IdentidadCliente";
import { urlLogo, type ClienteIdentidad } from "@/lib/clientes";

type Cliente = ClienteIdentidad & { activo: boolean };

const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";
const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireAdmin();
  const { error } = await searchParams;

  // El segundo intento es por si todavía no se corrió
  // scripts/portal_amigable.sql: la página sigue sirviendo para lo de antes.
  const completa = await supabase
    .from("clientes")
    .select("id, nombre, activo, logo_path, color_hex, color_opacidad")
    .order("nombre");

  const clientes = (completa.error
    ? (await supabase.from("clientes").select("id, nombre, activo").order("nombre")).data
    : completa.data) as Cliente[] | null;

  const lista = clientes ?? [];

  return (
    <AppShell title="Clientes" active="admin" isAdmin userEmail={user.email}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
        <AdminTabs active="clientes" />

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {completa.error && (
          <p
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Falta correr <code>scripts/portal_amigable.sql</code> en Supabase: todavía
            no se pueden guardar logos ni colores.
          </p>
        )}

        {/* Crear cliente */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Crear cliente</h2>
          <div className={cardClass}>
            <form
              action={createCliente}
              className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Nombre
                <input name="nombre" required className={inputClass} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm font-medium text-ink">
                <input name="activo" type="checkbox" defaultChecked className="h-4 w-4" />
                Activo
              </label>
              <button
                type="submit"
                className="h-fit rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Crear
              </button>
            </form>
          </div>
          <p className="text-sm text-muted">
            El logo y el color se cargan abajo, en la ficha del cliente.
          </p>
        </section>

        {/* Listado de clientes */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Clientes ({lista.length})
          </h2>

          {lista.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay clientes.</p>
          ) : (
            lista.map((cliente) => (
              <div key={cliente.id} className={cardClass}>
                <div className="flex flex-col gap-4">
                  <form action={updateCliente} className="flex flex-col gap-4">
                    <input type="hidden" name="id" value={cliente.id} />

                    <IdentidadCliente
                      nombre={cliente.nombre}
                      logoActual={urlLogo(cliente.logo_path)}
                      colorInicial={cliente.color_hex ?? null}
                      opacidadInicial={cliente.color_opacidad ?? null}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="submit"
                        className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                      >
                        Guardar cambios
                      </button>
                      <span className="text-xs text-muted">
                        PNG, SVG, JPG o WebP, hasta 1 MB.
                      </span>
                    </div>
                  </form>

                  <div className="flex items-center justify-end gap-3 border-t border-ink/10 pt-4">
                    <span
                      className={
                        cliente.activo
                          ? "inline-flex rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-medium text-white"
                          : "inline-flex rounded-full border border-ink/20 px-2.5 py-0.5 text-xs font-medium text-muted"
                      }
                    >
                      {cliente.activo ? "Activo" : "Inactivo"}
                    </span>
                    <form action={setClienteActivo}>
                      <input type="hidden" name="id" value={cliente.id} />
                      <input
                        type="hidden"
                        name="activo"
                        value={cliente.activo ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-ink/15 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-page"
                      >
                        {cliente.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}

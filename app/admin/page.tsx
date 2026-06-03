import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "./AdminTabs";
import {
  createDashboard,
  updateDashboard,
  deleteDashboard,
} from "./actions";
import { DashboardForm } from "./DashboardForm";

type Dashboard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
  content: string | null;
  embed_url: string | null;
  sort_order: number;
  is_active: boolean;
  cliente_id: string | null;
};

type Cliente = { id: string; nombre: string };

const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireAdmin();
  const { error } = await searchParams;

  const [{ data: dashboards }, { data: clientesData }] = await Promise.all([
    supabase
      .from("dashboards")
      .select(
        "id, slug, title, description, type, content, embed_url, sort_order, is_active, cliente_id",
      )
      .order("sort_order", { ascending: true }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  const allDashboards = (dashboards ?? []) as Dashboard[];
  const clientes = (clientesData ?? []) as Cliente[];

  return (
    <AppShell
      title="Administración"
      active="admin"
      isAdmin
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
        <AdminTabs active="tableros" />

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Tableros
          </h2>

          <div className={cardClass}>
            <h3 className="mb-4 text-base font-medium text-ink">
              Crear tablero
            </h3>
            <DashboardForm
              action={createDashboard}
              clientes={clientes}
              submitLabel="Crear"
            />
          </div>

          {allDashboards.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay tableros.</p>
          ) : (
            allDashboards.map((dashboard) => (
              <div key={dashboard.id} className={cardClass}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-base font-medium text-ink">
                    {dashboard.title}{" "}
                    <span className="text-muted">/{dashboard.slug}</span>
                  </h3>
                  <form action={deleteDashboard}>
                    <input type="hidden" name="id" value={dashboard.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
                <DashboardForm
                  action={updateDashboard}
                  clientes={clientes}
                  initial={dashboard}
                  submitLabel="Guardar cambios"
                />
              </div>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}

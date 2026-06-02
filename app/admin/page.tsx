import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  createDashboard,
  updateDashboard,
  deleteDashboard,
} from "./actions";
import { DashboardForm } from "./DashboardForm";
import { RoleCheckbox } from "./RoleCheckbox";

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
};

type Role = { id: string; name: string };
type RoleDashboard = { role_id: string; dashboard_id: string };

const cardClass =
  "rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;

  const [{ data: dashboards }, { data: roles }, { data: roleDashboards }] =
    await Promise.all([
      supabase
        .from("dashboards")
        .select(
          "id, slug, title, description, type, content, embed_url, sort_order, is_active",
        )
        .order("sort_order", { ascending: true }),
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("role_dashboards").select("role_id, dashboard_id"),
    ]);

  const allDashboards = (dashboards ?? []) as Dashboard[];
  const allRoles = (roles ?? []) as Role[];
  const assigned = new Set(
    ((roleDashboards ?? []) as RoleDashboard[]).map(
      (rd) => `${rd.dashboard_id}:${rd.role_id}`,
    ),
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Volver
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/usuarios"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Usuarios
          </Link>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Administración
          </h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {/* a) Gestión de tableros */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tableros
          </h2>

          <div className={cardClass}>
            <h3 className="mb-4 text-base font-medium text-zinc-900 dark:text-zinc-50">
              Crear tablero
            </h3>
            <DashboardForm action={createDashboard} submitLabel="Crear" />
          </div>

          {allDashboards.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay tableros.
            </p>
          ) : (
            allDashboards.map((dashboard) => (
              <div key={dashboard.id} className={cardClass}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                    {dashboard.title}{" "}
                    <span className="text-zinc-400">/{dashboard.slug}</span>
                  </h3>
                  <form action={deleteDashboard}>
                    <input type="hidden" name="id" value={dashboard.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
                <DashboardForm
                  action={updateDashboard}
                  initial={dashboard}
                  submitLabel="Guardar cambios"
                />
              </div>
            ))
          )}
        </section>

        {/* b) Asignación de permisos */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Permisos por rol
          </h2>

          {allRoles.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay roles definidos.
            </p>
          ) : allDashboards.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Crea un tablero para asignar permisos.
            </p>
          ) : (
            allDashboards.map((dashboard) => (
              <div key={dashboard.id} className={cardClass}>
                <h3 className="mb-3 text-base font-medium text-zinc-900 dark:text-zinc-50">
                  {dashboard.title}
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {allRoles.map((role) => (
                    <RoleCheckbox
                      key={role.id}
                      dashboardId={dashboard.id}
                      roleId={role.id}
                      label={role.name}
                      initialChecked={assigned.has(
                        `${dashboard.id}:${role.id}`,
                      )}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

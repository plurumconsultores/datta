import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/app/components/AppShell";
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

const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user } = await requireAdmin();
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
    <AppShell
      title="Administración"
      active="admin"
      isAdmin
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
        <div className="flex justify-end">
          <Link
            href="/admin/usuarios"
            className="rounded-md border border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
          >
            Usuarios
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* a) Gestión de tableros */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Tableros
          </h2>

          <div className={cardClass}>
            <h3 className="mb-4 text-base font-medium text-ink">
              Crear tablero
            </h3>
            <DashboardForm action={createDashboard} submitLabel="Crear" />
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
                  initial={dashboard}
                  submitLabel="Guardar cambios"
                />
              </div>
            ))
          )}
        </section>

        {/* b) Asignación de permisos */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Permisos por rol
          </h2>

          {allRoles.length === 0 ? (
            <p className="text-sm text-muted">No hay roles definidos.</p>
          ) : allDashboards.length === 0 ? (
            <p className="text-sm text-muted">
              Crea un tablero para asignar permisos.
            </p>
          ) : (
            allDashboards.map((dashboard) => (
              <div key={dashboard.id} className={cardClass}>
                <h3 className="mb-3 text-base font-medium text-ink">
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
    </AppShell>
  );
}

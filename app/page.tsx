import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/AppShell";
import { TypeChip } from "@/app/components/TypeChip";

type DashboardCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // RLS ya filtra a los tableros permitidos y activos; no añadimos filtros aquí.
  const { data: dashboards } = await supabase
    .from("dashboards")
    .select("id, slug, title, description, type")
    .order("sort_order", { ascending: true });

  const items = (dashboards ?? []) as DashboardCard[];

  return (
    <AppShell
      title="Mis tableros"
      active="dashboards"
      isAdmin={Boolean(isAdmin)}
      userEmail={user.email}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
            No tienes tableros asignados
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((dashboard) => (
              <li key={dashboard.id}>
                <Link
                  href={`/d/${dashboard.slug}`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
                >
                  <TypeChip type={dashboard.type} />
                  <h2 className="text-lg font-semibold text-ink">
                    {dashboard.title}
                  </h2>
                  {dashboard.description && (
                    <p className="text-sm text-muted">{dashboard.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

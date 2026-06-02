import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DashboardCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
};

const TYPE_LABELS: Record<DashboardCard["type"], string> = {
  native: "Nativo",
  powerbi: "Power BI",
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Sesión iniciada como{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {user.email}
          </span>
        </p>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Administración
            </Link>
          )}

          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tableros
        </h1>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No tienes tableros asignados
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((dashboard) => (
              <li key={dashboard.id}>
                <Link
                  href={`/d/${dashboard.slug}`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-black/30 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30 dark:hover:bg-zinc-800"
                >
                  <span className="inline-flex w-fit rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {TYPE_LABELS[dashboard.type] ?? dashboard.type}
                  </span>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {dashboard.title}
                  </h2>
                  {dashboard.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {dashboard.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

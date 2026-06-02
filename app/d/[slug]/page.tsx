import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Dashboard = {
  slug: string;
  title: string;
  type: "native" | "powerbi";
  embed_url: string | null;
  content: string | null;
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  // RLS hace que un tablero sin permiso (o inactivo) simplemente no aparezca.
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("slug, title, type, embed_url, content")
    .eq("slug", slug)
    .single<Dashboard>();

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Volver
        </Link>
        <h1 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {dashboard.title}
        </h1>
      </header>

      <div className="flex-1 overflow-hidden">
        {dashboard.type === "powerbi" ? (
          <iframe
            src={dashboard.embed_url ?? undefined}
            title={dashboard.title}
            className="h-full w-full border-0"
            allowFullScreen
          />
        ) : (
          <iframe
            srcDoc={dashboard.content ?? undefined}
            title={dashboard.title}
            // Aislamos el contenido nativo: permitimos scripts pero NO
            // allow-same-origin, para que no acceda a las cookies ni al origen.
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Dashboard = {
  slug: string;
  title: string;
  type: "native" | "powerbi";
  embed_url: string | null;
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
    .select("slug, title, type, embed_url")
    .eq("slug", slug)
    .single<Dashboard>();

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col bg-page">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-surface px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="flex items-center justify-center rounded-lg border border-ink/10 bg-surface p-1.5 transition-colors hover:bg-page"
          >
            <Image
              src="/PlurumLogo.svg"
              alt="Plurum — Inicio"
              width={117}
              height={47}
              priority
              unoptimized
              className="h-7 w-auto"
            />
          </Link>
          <span className="hidden h-6 w-px bg-ink/15 sm:block" aria-hidden />
          <h1 className="truncate text-base font-semibold text-ink">
            {dashboard.title}
          </h1>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-md border border-brand-700 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
        >
          ← Volver
        </Link>
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
            src={`/d/${dashboard.slug}/raw`}
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

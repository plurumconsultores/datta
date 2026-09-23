import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisorTablero } from "@/app/components/VisorTablero";
import { COLOR_PLURUM, colorCliente, urlLogo } from "@/lib/clientes";

type Dashboard = {
  slug: string;
  title: string;
  type: "native" | "powerbi";
  embed_url: string | null;
  cliente_id: string | null;
};

type ClienteFila = {
  nombre: string;
  logo_path: string | null;
  color_hex: string | null;
};

/** Los tableros internos se presentan con la marca de Plurum. */
const LOGO_PLURUM = "/PlurumLogo.svg";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();

  // Email del usuario logueado para pasarlo al tablero nativo (campos de
  // auditoría tipo "Creado por / Eliminado por"). Puede no venir, lo manejamos.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email;

  // RLS hace que un tablero sin permiso (o inactivo) simplemente no aparezca.
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("slug, title, type, embed_url, cliente_id")
    .eq("slug", slug)
    .single<Dashboard>();

  if (!dashboard) {
    notFound();
  }

  // Identidad del cliente para la pantalla de carga. Si algo falla, se usa la
  // marca de Plurum: es una pantalla de espera, no vale la pena romper nada.
  let cliente: ClienteFila | null = null;
  if (dashboard.cliente_id) {
    const { data } = await supabase
      .from("clientes")
      .select("nombre, logo_path, color_hex")
      .eq("id", dashboard.cliente_id)
      .maybeSingle<ClienteFila>();
    cliente = data ?? null;
  }

  // Solo añadimos ?user= si hay correo; nunca metemos "undefined" en la URL.
  const rawSrc = userEmail
    ? `/d/${dashboard.slug}/raw?user=${encodeURIComponent(userEmail)}`
    : `/d/${dashboard.slug}/raw`;

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
        <VisorTablero
          src={
            dashboard.type === "powerbi"
              ? (dashboard.embed_url ?? undefined)
              : rawSrc
          }
          titulo={dashboard.title}
          esPowerBi={dashboard.type === "powerbi"}
          clienteNombre={cliente?.nombre ?? null}
          clienteLogo={
            dashboard.cliente_id
              ? urlLogo(cliente?.logo_path)
              : LOGO_PLURUM
          }
          color={
            dashboard.cliente_id
              ? colorCliente(cliente?.color_hex)
              : COLOR_PLURUM
          }
        />
      </div>
    </div>
  );
}

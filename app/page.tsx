import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/AppShell";
import {
  ClienteFilterProvider,
  ClienteSelect,
  type ClienteOption,
} from "@/app/components/ClienteFilter";
import {
  DashboardGrid,
  type DashboardCard,
} from "@/app/components/DashboardGrid";

type Cliente = { id: string; nombre: string };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // RLS filtra a lo permitido: dashboards visibles y clientes visibles
  // (los asignados, o todos si el usuario "ve todo"). Sin filtros en código.
  const [{ data: dashboards }, { data: clientesData }] = await Promise.all([
    supabase
      .from("dashboards")
      .select("id, slug, title, description, type, cliente_id")
      .order("sort_order", { ascending: true }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  const items = (dashboards ?? []) as DashboardCard[];
  const clientes = (clientesData ?? []) as Cliente[];

  // ¿Hay tableros internos (cliente_id null) visibles? -> grupo "Internos".
  const hasInternos = items.some((d) => d.cliente_id === null);
  const groupCount = clientes.length + (hasInternos ? 1 : 0);

  // Selector de la barra superior según la cantidad de grupos disponibles.
  let headerSlot: ReactNode = null;
  if (groupCount > 1) {
    const options: ClienteOption[] = [
      { value: "todos", label: "Todos" },
      ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
      ...(hasInternos ? [{ value: "internos", label: "Internos" }] : []),
    ];
    headerSlot = <ClienteSelect options={options} />;
  } else if (groupCount === 1) {
    const nombre = clientes.length === 1 ? clientes[0].nombre : "Internos";
    headerSlot = (
      <span className="rounded-md bg-page px-3 py-1.5 text-sm font-medium text-ink">
        {nombre}
      </span>
    );
  }

  return (
    <ClienteFilterProvider initial="todos">
      <AppShell
        title="Mis tableros"
        active="dashboards"
        isAdmin={Boolean(isAdmin)}
        userEmail={user.email}
        headerSlot={headerSlot}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <DashboardGrid dashboards={items} />
        </div>
      </AppShell>
    </ClienteFilterProvider>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/AppShell";
import {
  DashboardGrid,
  type DashboardCard,
  type GrupoCliente,
} from "@/app/components/DashboardGrid";
import type { OpcionCliente } from "@/app/components/ClienteFilter";
import {
  COLOR_PLURUM,
  OPACIDAD_POR_DEFECTO,
  colorCliente,
  tinteCliente,
  urlLogo,
  type ClienteIdentidad,
} from "@/lib/clientes";

type DashboardFila = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
  cliente_id: string | null;
  updated_at?: string | null;
};

/** Los tableros internos (sin cliente) se muestran con la marca de Plurum. */
const LOGO_PLURUM = "/PlurumLogo.svg";
const ZONA = "America/Bogota";

/**
 * "Actualizado ayer", "Actualizado hace 3 días"... Se arma en el servidor y
 * siempre en la hora de Bogotá, para que el texto sea el mismo aquí y en el
 * navegador (si no, la hidratación se queja).
 */
function formatoActualizado(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;

  const enBogota = (d: Date) =>
    new Intl.DateTimeFormat("es-CO", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const aDias = (d: Date) => {
    const [dia, mes, anio] = enBogota(d).split("/").map(Number);
    return Date.UTC(anio, mes - 1, dia) / 86_400_000;
  };

  const diferencia = aDias(new Date()) - aDias(fecha);

  if (diferencia <= 0) {
    const hora = new Intl.DateTimeFormat("es-CO", {
      timeZone: ZONA,
      hour: "numeric",
      minute: "2-digit",
    }).format(fecha);
    return `Actualizado hoy, ${hora}`;
  }
  if (diferencia === 1) return "Actualizado ayer";
  if (diferencia < 7) return `Actualizado hace ${diferencia} días`;

  const dia = new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA,
    day: "numeric",
    month: "long",
  }).format(fecha);
  return `Actualizado el ${dia}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { cliente: clienteParam } = await searchParams;
  const { data: isAdmin } = await supabase.rpc("is_admin");

  // RLS filtra a lo permitido: dashboards visibles y clientes visibles
  // (los asignados, o todos si el usuario "ve todo"). Sin filtros en código.
  // El segundo intento de cada consulta es por si todavía no se corrió
  // scripts/portal_amigable.sql: el portal sigue funcionando, sin fecha ni
  // identidad de cliente.
  const [dashboards, clientes] = await Promise.all([
    (async () => {
      const completa = await supabase
        .from("dashboards")
        .select("id, slug, title, description, type, cliente_id, updated_at")
        .order("sort_order", { ascending: true });
      if (!completa.error) return (completa.data ?? []) as DashboardFila[];

      const basica = await supabase
        .from("dashboards")
        .select("id, slug, title, description, type, cliente_id")
        .order("sort_order", { ascending: true });
      return (basica.data ?? []) as DashboardFila[];
    })(),
    (async () => {
      const completa = await supabase
        .from("clientes")
        .select("id, nombre, logo_path, color_hex, color_opacidad")
        .order("nombre");
      if (!completa.error) return (completa.data ?? []) as ClienteIdentidad[];

      const basica = await supabase.from("clientes").select("id, nombre").order("nombre");
      return (basica.data ?? []) as ClienteIdentidad[];
    })(),
  ]);

  // Ids de los clientes que la consulta devolvió. Un tablero que apunte a un
  // cliente fuera de esa lista (inactivo, o que RLS no deja ver) no puede
  // quedarse sin sección: cae en "Otros tableros".
  const idsVisibles = new Set(clientes.map((cliente) => String(cliente.id)));

  function grupoDe(clienteId: string | null | undefined): string {
    if (clienteId === null || clienteId === undefined) return "internos";
    const id = String(clienteId);
    return idsVisibles.has(id) ? id : "otros";
  }

  const items: DashboardCard[] = dashboards.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    description: d.description,
    type: d.type,
    grupo: grupoDe(d.cliente_id),
    actualizado: formatoActualizado(d.updated_at),
  }));

  const hayInternos = items.some((d) => d.grupo === "internos");
  const hayOtros = items.some((d) => d.grupo === "otros");

  const grupos: GrupoCliente[] = [
    ...clientes
      .filter((cliente) => items.some((d) => d.grupo === String(cliente.id)))
      .map((cliente) => ({
        value: String(cliente.id),
        nombre: cliente.nombre,
        logo: urlLogo(cliente.logo_path),
        color: colorCliente(cliente.color_hex),
        tinte: tinteCliente(cliente.color_hex, cliente.color_opacidad),
      })),
    ...(hayInternos
      ? [
          {
            value: "internos",
            nombre: "Internos",
            logo: LOGO_PLURUM,
            color: COLOR_PLURUM,
            tinte: tinteCliente(COLOR_PLURUM, OPACIDAD_POR_DEFECTO),
          },
        ]
      : []),
    ...(hayOtros
      ? [
          {
            value: "otros",
            nombre: "Otros tableros",
            logo: null,
            color: COLOR_PLURUM,
            tinte: tinteCliente(COLOR_PLURUM, OPACIDAD_POR_DEFECTO),
          },
        ]
      : []),
  ];

  const opciones: OpcionCliente[] = [
    { value: "todos", label: "Todos", count: items.length, logo: null, color: COLOR_PLURUM },
    ...grupos.map((grupo) => ({
      value: grupo.value,
      label: grupo.nombre,
      count: items.filter((d) => d.grupo === grupo.value).length,
      logo: grupo.logo,
      color: grupo.color,
    })),
  ];

  // Un ?cliente= que no exista (o de un cliente sin tableros visibles) se
  // ignora en vez de mostrar el portal vacío.
  const seleccionado =
    clienteParam && grupos.some((g) => g.value === clienteParam) ? clienteParam : "todos";

  return (
    <AppShell
      title="Mis tableros"
      active="dashboards"
      isAdmin={Boolean(isAdmin)}
      userEmail={user.email}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <DashboardGrid
          dashboards={items}
          grupos={grupos}
          opciones={opciones}
          seleccionado={seleccionado}
        />
      </div>
    </AppShell>
  );
}

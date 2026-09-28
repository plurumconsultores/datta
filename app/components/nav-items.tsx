import type { ReactNode } from "react";
import { DashboardsIcon, AdminIcon, EncuestasIcon } from "./icons";

export type NavKey = "dashboards" | "encuestas" | "admin";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: ReactNode;
};

/**
 * Items de navegación de la barra lateral. "Encuestas" la ve el equipo de
 * Plurum (admin o analista) y "Administración" solo un admin; la verificación
 * de verdad la hacen las páginas y RLS, esto solo decide qué se dibuja.
 */
export function getNavItems(isAdmin: boolean, esEquipo = false): NavItem[] {
  const items: NavItem[] = [
    {
      key: "dashboards",
      href: "/",
      label: "Tableros",
      icon: <DashboardsIcon className="h-5 w-5" />,
    },
  ];

  // El equipo entra al editor; un cliente, a su lista de enlaces y QR.
  items.push({
    key: "encuestas",
    href: esEquipo || isAdmin ? "/admin/encuestas" : "/encuestas",
    label: "Encuestas",
    icon: <EncuestasIcon className="h-5 w-5" />,
  });

  if (isAdmin) {
    items.push({
      key: "admin",
      href: "/admin",
      label: "Administración",
      icon: <AdminIcon className="h-5 w-5" />,
    });
  }

  return items;
}

import type { ReactNode } from "react";
import { DashboardsIcon, AdminIcon } from "./icons";

export type NavKey = "dashboards" | "admin";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: ReactNode;
};

/**
 * Items de navegación de la barra lateral. "Administración" solo aparece si el
 * usuario es admin (la verificación is_admin se hace en las páginas).
 */
export function getNavItems(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    {
      key: "dashboards",
      href: "/",
      label: "Tableros",
      icon: <DashboardsIcon className="h-5 w-5" />,
    },
  ];

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

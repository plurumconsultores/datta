import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getNavItems, type NavKey } from "./nav-items";
import { MobileNav } from "./MobileNav";

/**
 * Layout de las páginas autenticadas: barra lateral fija (rail) + barra
 * superior con logo y título, y el contenido en el área principal.
 *
 * Presentacional: no consulta nada. Las páginas le pasan el usuario, si es
 * admin, el título y la sección activa.
 */
export function AppShell({
  title,
  active,
  isAdmin,
  userEmail,
  headerSlot,
  children,
}: {
  title: string;
  active: NavKey;
  isAdmin: boolean;
  userEmail: string | undefined;
  /** Contenido opcional en la barra superior (p. ej. el filtro de clientes). */
  headerSlot?: ReactNode;
  children: ReactNode;
}) {
  const items = getNavItems(isAdmin);

  return (
    <div className="flex min-h-screen bg-page">
      {/* Barra lateral fija (desktop) */}
      <aside className="hidden w-[60px] shrink-0 flex-col items-center gap-2 bg-brand-900 py-4 sm:flex">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            aria-current={item.key === active ? "page" : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              item.key === active
                ? "bg-white/10 text-brand-300"
                : "text-brand-300/55 hover:bg-white/5 hover:text-brand-300"
            }`}
          >
            {item.icon}
          </Link>
        ))}
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNav items={items} active={active} />

            <div className="flex items-center justify-center rounded-lg border border-ink/10 bg-surface p-1.5">
              <Image
                src="/PlurumLogo.svg"
                alt="Plurum"
                width={117}
                height={47}
                priority
                unoptimized
                className="h-7 w-auto"
              />
            </div>

            <span className="hidden h-6 w-px bg-ink/15 sm:block" aria-hidden />
            <h1 className="truncate text-base font-semibold text-ink">
              {title}
            </h1>
            {headerSlot && <div className="ml-1 shrink-0">{headerSlot}</div>}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {userEmail}
            </span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

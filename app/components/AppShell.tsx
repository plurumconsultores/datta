import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { getNavItems, type NavKey } from "./nav-items";
import { MobileNav } from "./MobileNav";

/**
 * Layout de las páginas autenticadas: rail lateral expandible + barra superior
 * con logo y título, y el contenido en el área principal.
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
    <div className="min-h-screen bg-page">
      {/*
        Rail expandible (desktop). Colapsado (60px) muestra solo íconos; al pasar
        el mouse se expande (overlay, z alto) revelando las etiquetas sin que el
        contenido salte. Fijo y de alto completo.
      */}
      <aside className="group fixed inset-y-0 left-0 z-50 hidden w-[60px] flex-col overflow-hidden bg-brand-900 transition-[width] duration-200 ease-out hover:w-56 hover:shadow-xl sm:flex">
        <Link
          href="/"
          aria-label="Ir al inicio"
          className="flex h-16 shrink-0 items-center px-[14px]"
        >
          {/* Colapsado: isotipo compacto. Expandido (hover): logo completo. */}
          <Image
            src="/plurum-isotipo-blanco.svg"
            alt="Plurum"
            width={95}
            height={92}
            priority
            unoptimized
            className="h-7 w-auto group-hover:hidden"
          />
          <Image
            src="/plurum-blanco.svg"
            alt="Plurum"
            width={117}
            height={47}
            priority
            unoptimized
            className="hidden h-7 w-auto group-hover:block"
          />
        </Link>

        <nav className="flex flex-col gap-1 py-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={item.key === active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 px-[14px] transition-colors ${
                item.key === active
                  ? "bg-brand-700 text-white"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                {item.icon}
              </span>
              <span className="invisible whitespace-nowrap text-sm font-medium opacity-0 transition-[opacity,visibility] duration-200 group-hover:visible group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Columna principal (reserva 60px del rail en desktop) */}
      <div className="flex min-h-screen flex-col sm:pl-[60px]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink/10 bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNav items={items} active={active} />

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

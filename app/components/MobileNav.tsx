"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "./icons";
import type { NavItem, NavKey } from "./nav-items";

/**
 * En móvil/táctil el rail se colapsa en un botón (hamburguesa) que abre un
 * drawer con los mismos items de navegación. Oculto en >= sm.
 */
export function MobileNav({
  items,
  active,
}: {
  items: NavItem[];
  active: NavKey;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink transition-colors hover:bg-page"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <nav className="absolute left-0 top-0 flex h-full w-64 flex-col bg-brand-900">
            <div className="flex h-16 items-center justify-between gap-2 px-4">
              <Link href="/" onClick={() => setOpen(false)} aria-label="Ir al inicio">
                <Image
                  src="/plurum-blanco.svg"
                  alt="Plurum"
                  width={117}
                  height={47}
                  priority
                  unoptimized
                  className="h-7 w-auto"
                />
              </Link>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1 p-2">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.key === active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    item.key === active
                      ? "bg-brand-700 text-white"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

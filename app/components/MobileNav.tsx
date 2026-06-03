"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "./icons";
import type { NavItem, NavKey } from "./nav-items";

/**
 * En móvil la barra lateral se colapsa en un botón (hamburguesa) que abre un
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
          <nav className="absolute left-0 top-0 flex h-full w-64 flex-col gap-1 bg-brand-900 p-3">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="mb-2 flex h-9 w-9 items-center justify-center self-end rounded-md text-brand-300/70 transition-colors hover:bg-white/10 hover:text-brand-300"
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  item.key === active
                    ? "bg-white/10 text-brand-300"
                    : "text-brand-300/70 hover:bg-white/5 hover:text-brand-300"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

"use client";

import { ClienteLogo } from "./ClienteLogo";

export type OpcionCliente = {
  /** "todos", "internos" o el id del cliente. */
  value: string;
  label: string;
  count: number;
  logo: string | null;
  color: string;
};

/**
 * Filtro de clientes del portal: una fila de chips con logo y conteo. Filtra en
 * el navegador, sin esperar al servidor, y quien lo pulsa deja la selección
 * escrita en la URL (/?cliente=<id>) para poder compartir el enlace.
 */
export function ClienteChips({
  opciones,
  seleccionado,
  onSelect,
}: {
  opciones: OpcionCliente[];
  seleccionado: string;
  onSelect: (valor: string) => void;
}) {
  // "Todos" + un solo grupo: no hay nada que filtrar.
  if (opciones.length <= 2) return null;

  return (
    <nav aria-label="Filtrar por cliente" className="flex flex-wrap items-center gap-2">
      {opciones.map((opcion) => {
        const activo = opcion.value === seleccionado;

        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => onSelect(opcion.value)}
            aria-pressed={activo}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-sm font-medium transition-colors ${
              activo
                ? "bg-brand-900 text-white"
                : "border border-ink/15 bg-surface text-ink hover:bg-page"
            }`}
          >
            {opcion.value !== "todos" && (
              <ClienteLogo
                nombre={opcion.label}
                logo={opcion.logo}
                color={opcion.color}
                tamano={24}
              />
            )}
            {opcion.label} · {opcion.count}
          </button>
        );
      })}
    </nav>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ClienteFilterContextValue = {
  selected: string;
  setSelected: (value: string) => void;
};

const ClienteFilterContext = createContext<ClienteFilterContextValue | null>(
  null,
);

/**
 * Comparte la selección del filtro de clientes entre el desplegable de la barra
 * superior y la cuadrícula del portal. El filtrado ocurre en el navegador
 * (son pocos tableros). RLS ya limitó qué puede ver el usuario.
 */
export function ClienteFilterProvider({
  initial = "todos",
  children,
}: {
  initial?: string;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(initial);

  return (
    <ClienteFilterContext.Provider value={{ selected, setSelected }}>
      {children}
    </ClienteFilterContext.Provider>
  );
}

export function useClienteFilter() {
  const ctx = useContext(ClienteFilterContext);
  if (!ctx) {
    throw new Error("ClienteFilter debe usarse dentro de ClienteFilterProvider");
  }
  return ctx;
}

export type ClienteOption = { value: string; label: string };

export function ClienteSelect({ options }: { options: ClienteOption[] }) {
  const { selected, setSelected } = useClienteFilter();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Filtrar por cliente</span>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-md border border-ink/15 bg-surface px-3 py-1.5 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

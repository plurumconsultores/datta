import Link from "next/link";
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
 * Filtro de clientes del portal: una fila de chips con logo y conteo. La
 * selección viaja en la URL (/?cliente=<id>), así sobrevive a entrar a un
 * tablero y volver, y el enlace se puede compartir.
 */
export function ClienteChips({
  opciones,
  seleccionado,
}: {
  opciones: OpcionCliente[];
  seleccionado: string;
}) {
  // "Todos" + un solo grupo: no hay nada que filtrar.
  if (opciones.length <= 2) return null;

  return (
    <nav aria-label="Filtrar por cliente" className="flex flex-wrap items-center gap-2">
      {opciones.map((opcion) => {
        const activo = opcion.value === seleccionado;
        const href =
          opcion.value === "todos" ? "/" : `/?cliente=${encodeURIComponent(opcion.value)}`;

        return (
          <Link
            key={opcion.value}
            href={href}
            scroll={false}
            aria-current={activo ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-3 pr-3.5 text-sm font-medium transition-colors ${
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
                tamano={18}
              />
            )}
            {opcion.label} · {opcion.count}
          </Link>
        );
      })}
    </nav>
  );
}

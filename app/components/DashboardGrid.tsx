"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { TypeChip } from "./TypeChip";
import { ClienteLogo } from "./ClienteLogo";
import { ClienteChips, type OpcionCliente } from "./ClienteFilter";

export type DashboardCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
  /** Id del cliente, "internos" o "otros". Lo calcula el servidor. */
  grupo: string;
  /** Texto ya armado en el servidor: "Actualizado ayer", etc. */
  actualizado: string | null;
};

export type GrupoCliente = {
  /** Id del cliente, o "internos" para los tableros sin cliente. */
  value: string;
  nombre: string;
  logo: string | null;
  color: string;
  /** Color + transparencia listos para CSS (variable --tinte). */
  tinte: string;
};

const CLAVE_FIJADOS = "datta:tableros-fijados";

/** Quita tildes y pasa a minúsculas para que la búsqueda no dependa de ellas. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function DashboardGrid({
  dashboards,
  grupos,
  opciones,
  seleccionado,
}: {
  dashboards: DashboardCard[];
  grupos: GrupoCliente[];
  opciones: OpcionCliente[];
  seleccionado: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [fijados, setFijados] = useState<string[]>([]);
  // El cliente elegido se maneja aquí: filtra al instante y de paso deja la
  // selección en la URL, sin depender de que el servidor vuelva a responder.
  const [cliente, setCliente] = useState(seleccionado);

  useEffect(() => {
    setCliente(seleccionado);
  }, [seleccionado]);

  function elegirCliente(valor: string) {
    setCliente(valor);
    try {
      const url =
        valor === "todos" ? "/" : `/?cliente=${encodeURIComponent(valor)}`;
      window.history.replaceState(null, "", url);
    } catch {
      // Si el navegador no deja tocar la URL, el filtro igual funciona.
    }
  }

  // Los fijados viven en el navegador de cada quien: se leen después de montar
  // para que el HTML del servidor y el del cliente coincidan.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_FIJADOS);
      if (guardado) {
        const parseado: unknown = JSON.parse(guardado);
        if (Array.isArray(parseado)) {
          setFijados(parseado.filter((v): v is string => typeof v === "string"));
        }
      }
    } catch {
      // Navegador sin almacenamiento disponible: se sigue sin fijados.
    }
  }, []);

  function alternarFijado(slug: string) {
    setFijados((actuales) => {
      const siguientes = actuales.includes(slug)
        ? actuales.filter((s) => s !== slug)
        : [...actuales, slug];
      try {
        window.localStorage.setItem(CLAVE_FIJADOS, JSON.stringify(siguientes));
      } catch {
        // Si no se puede guardar, al menos vale para esta sesión.
      }
      return siguientes;
    });
  }

  const nombrePorGrupo = useMemo(
    () => new Map(grupos.map((g) => [g.value, g.nombre])),
    [grupos],
  );

  const termino = normalizar(busqueda.trim());

  const visibles = dashboards.filter((dashboard) => {
    const grupo = dashboard.grupo;
    if (cliente !== "todos" && grupo !== cliente) return false;
    if (!termino) return true;
    const texto = normalizar(
      `${dashboard.title} ${dashboard.description ?? ""} ${nombrePorGrupo.get(grupo) ?? ""}`,
    );
    return texto.includes(termino);
  });

  const fijadosVisibles = visibles.filter((d) => fijados.includes(d.slug));

  if (dashboards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
        No tienes tableros asignados
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 py-2.5 sm:max-w-sm">
            <IconoBuscar />
            <span className="sr-only">Buscar tablero</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tablero o cliente…"
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </label>
          <span className="text-sm text-muted">
            {visibles.length === dashboards.length
              ? `${dashboards.length} tableros`
              : `${visibles.length} de ${dashboards.length} tableros`}
          </span>
        </div>

        <ClienteChips
          opciones={opciones}
          seleccionado={cliente}
          onSelect={elegirCliente}
        />
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center">
          <p className="text-muted">No hay tableros para esta búsqueda</p>
          {(termino || cliente !== "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                elegirCliente("todos");
              }}
              className="rounded-md border border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {fijadosVisibles.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <IconoEstrella relleno className="h-4 w-4 text-brand-900" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Fijados
                </h2>
              </div>
              <Cuadricula>
                {fijadosVisibles.map((dashboard) => (
                  <Tarjeta
                    key={`fijado-${dashboard.id}`}
                    dashboard={dashboard}
                    grupo={grupos.find((g) => g.value === dashboard.grupo)}
                    fijado
                    onFijar={alternarFijado}
                  />
                ))}
              </Cuadricula>
            </section>
          )}

          {grupos.map((grupo) => {
            const items = visibles.filter((d) => d.grupo === grupo.value);
            if (items.length === 0) return null;

            return (
              <section
                key={grupo.value}
                className="grupo-cliente flex flex-col gap-3"
                style={{ "--tinte": grupo.tinte } as CSSProperties}
              >
                <div className="flex items-center gap-3">
                  <ClienteLogo
                    nombre={grupo.nombre}
                    logo={grupo.logo}
                    color={grupo.color}
                    tamano={30}
                  />
                  <h2 className="text-base font-bold text-ink">{grupo.nombre}</h2>
                  <span className="text-sm text-muted">
                    {items.length === 1 ? "1 tablero" : `${items.length} tableros`}
                  </span>
                </div>

                <Cuadricula>
                  {items.map((dashboard) => (
                    <Tarjeta
                      key={dashboard.id}
                      dashboard={dashboard}
                      grupo={grupo}
                      fijado={fijados.includes(dashboard.slug)}
                      onFijar={alternarFijado}
                    />
                  ))}
                </Cuadricula>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function Cuadricula({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>
  );
}

function Tarjeta({
  dashboard,
  grupo,
  fijado,
  onFijar,
}: {
  dashboard: DashboardCard;
  grupo: GrupoCliente | undefined;
  fijado: boolean;
  onFijar: (slug: string) => void;
}) {
  return (
    <li className="relative flex h-full flex-col gap-2.5 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md">
      <div className="flex items-center gap-2">
        {grupo && (
          <span className="rounded-full bg-page px-2.5 py-0.5 text-xs font-semibold text-ink">
            {grupo.nombre}
          </span>
        )}
        <TypeChip type={dashboard.type} />
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onFijar(dashboard.slug)}
          aria-pressed={fijado}
          aria-label={fijado ? "Quitar de fijados" : "Fijar tablero"}
          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-page ${
            fijado ? "text-brand-900" : "text-muted"
          }`}
        >
          <IconoEstrella relleno={fijado} className="h-[18px] w-[18px]" />
        </button>
      </div>

      <Link
        href={`/d/${dashboard.slug}`}
        className="text-lg font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-['']"
      >
        {dashboard.title}
      </Link>

      {dashboard.description && (
        <p className="text-sm text-muted">{dashboard.description}</p>
      )}

      {dashboard.actualizado && (
        <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted">
          <IconoReloj />
          {dashboard.actualizado}
        </p>
      )}
    </li>
  );
}

function IconoBuscar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="h-4 w-4 shrink-0 text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function IconoEstrella({
  relleno = false,
  className = "",
}: {
  relleno?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={relleno ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={relleno ? 1.6 : 1.8}
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <polygon points="12 2.6 15.1 9 22 9.9 17 14.7 18.2 21.5 12 18.3 5.8 21.5 7 14.7 2 9.9 8.9 9" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

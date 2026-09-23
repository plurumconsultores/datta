"use client";

import { useState, useTransition } from "react";
import type { VariableTablero } from "@/lib/segregacion";
import { guardarLimite, limpiarLimites, setSegregacionUsuario } from "./actions";

export type TableroSegregacion = {
  slug: string;
  title: string;
  variables: VariableTablero[];
  /** Límites guardados: {variable: valores permitidos}. */
  limites: Record<string, string[]>;
};

/**
 * Segregación de datos de un usuario: primero el interruptor y, si está
 * encendido, un bloque por cada tablero al que ese usuario tiene acceso.
 * Cada cambio se guarda solo, como el resto de esta página.
 */
export function SegregacionUsuario({
  userId,
  requiereInicial,
  tableros,
}: {
  userId: string;
  requiereInicial: boolean;
  tableros: TableroSegregacion[];
}) {
  const [requiere, setRequiere] = useState(requiereInicial);
  const [limites, setLimites] = useState<Record<string, Record<string, string[]>>>(
    () => Object.fromEntries(tableros.map((t) => [t.slug, { ...t.limites }])),
  );
  const [pendiente, startTransition] = useTransition();

  function cambiarInterruptor(valor: boolean) {
    setRequiere(valor);
    startTransition(async () => {
      try {
        await setSegregacionUsuario(userId, valor);
      } catch (err) {
        setRequiere(!valor);
        alert(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  function quitarLimites(slug: string) {
    const previos = limites[slug] ?? {};
    setLimites((actual) => ({ ...actual, [slug]: {} }));
    startTransition(async () => {
      try {
        await limpiarLimites(userId, slug);
      } catch (err) {
        setLimites((actual) => ({ ...actual, [slug]: previos }));
        alert(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  function alternarValor(slug: string, variable: string, valor: string) {
    const previos = limites[slug]?.[variable] ?? [];
    const siguientes = previos.includes(valor)
      ? previos.filter((v) => v !== valor)
      : [...previos, valor];

    setLimites((actual) => ({
      ...actual,
      [slug]: { ...(actual[slug] ?? {}), [variable]: siguientes },
    }));

    startTransition(async () => {
      try {
        await guardarLimite(userId, slug, variable, siguientes);
      } catch (err) {
        setLimites((actual) => ({
          ...actual,
          [slug]: { ...(actual[slug] ?? {}), [variable]: previos },
        }));
        alert(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  /** Un tablero está limitado si alguna de sus variables tiene valores elegidos. */
  function estaLimitado(slug: string): boolean {
    const delTablero = limites[slug] ?? {};
    return Object.values(delTablero).some((valores) => valores.length > 0);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={requiere}
          disabled={pendiente}
          onChange={(e) => cambiarInterruptor(e.target.checked)}
          className="h-4 w-4"
        />
        Requiere segregación de datos
      </label>

      {!requiere ? (
        <p className="text-sm text-muted">
          Ve los datos completos de cada tablero al que tiene acceso.
        </p>
      ) : tableros.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no tiene acceso a ningún tablero: asígnale un cliente arriba.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tableros.map((tablero) => {
            const limitado = estaLimitado(tablero.slug);
            const sinVariables = tablero.variables.length === 0;

            return (
              <div
                key={tablero.slug}
                className="rounded-lg border border-ink/10 bg-page/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{tablero.title}</p>

                  {sinVariables ? (
                    <span className="text-xs text-muted">
                      Este tablero no declara variables
                    </span>
                  ) : (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name={`limite-${userId}-${tablero.slug}`}
                          checked={!limitado}
                          disabled={pendiente}
                          onChange={() => quitarLimites(tablero.slug)}
                          className="h-4 w-4"
                        />
                        Sin limitación
                      </label>
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name={`limite-${userId}-${tablero.slug}`}
                          checked={limitado}
                          readOnly
                          className="h-4 w-4"
                        />
                        Limitar datos
                      </label>
                    </div>
                  )}
                </div>

                {!sinVariables && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3">
                    {tablero.variables.map((variable) => {
                      const elegidos = limites[tablero.slug]?.[variable.clave] ?? [];

                      return (
                        <div key={variable.clave}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                            {variable.etiqueta}
                            {elegidos.length > 0 && (
                              <span className="ml-2 font-normal normal-case tracking-normal">
                                solo {elegidos.length} de {variable.valores.length}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {variable.valores.map((valor) => (
                              <label
                                key={valor}
                                className="flex items-center gap-2 text-sm text-ink"
                              >
                                <input
                                  type="checkbox"
                                  checked={elegidos.includes(valor)}
                                  disabled={pendiente}
                                  onChange={() =>
                                    alternarValor(tablero.slug, variable.clave, valor)
                                  }
                                  className="h-4 w-4"
                                />
                                {valor}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted">
                      Sin ninguna casilla marcada, esa variable no limita nada.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

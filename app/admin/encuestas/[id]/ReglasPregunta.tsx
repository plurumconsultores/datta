"use client";

import { useState } from "react";
import {
  opcionesPosibles,
  type Condicion,
  type GrupoOpciones,
  type OpcionesSegun,
  type Pregunta,
} from "@/lib/encuestas";

const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-ink";

/** Resumen de una condición, para leerla sin abrir el bloque. */
function resumen(pregunta: Pregunta, anteriores: Pregunta[]): string {
  const nombre = (id: string) => {
    const fuente = anteriores.find((p) => p.id === id);
    return fuente ? fuente.texto || fuente.id : id;
  };

  const partes: string[] = [];
  if (pregunta.condicion) {
    partes.push(
      `se muestra solo si en "${nombre(pregunta.condicion.pregunta)}" marcan ${pregunta.condicion.valores.join(" o ")}`,
    );
  }
  if (pregunta.opcionesSegun) {
    partes.push(`sus opciones dependen de "${nombre(pregunta.opcionesSegun.pregunta)}"`);
  }
  return partes.length === 0 ? "Se muestra siempre" : partes.join(" · ");
}

/**
 * Las reglas de una pregunta: cuándo se muestra y de dónde salen sus
 * opciones. Va plegado, porque la mayoría de las preguntas no necesita nada
 * de esto y abierto se come la pantalla.
 */
export function ReglasPregunta({
  pregunta,
  anteriores,
  onCambiar,
}: {
  pregunta: Pregunta;
  /** Preguntas anteriores con opciones: son las únicas que sirven de base. */
  anteriores: Pregunta[];
  onCambiar: (cambios: Partial<Pregunta>) => void;
}) {
  const hayReglas = pregunta.condicion !== null || pregunta.opcionesSegun !== null;
  const [abierto, setAbierto] = useState(hayReglas);

  const puedeTenerOpciones = pregunta.tipo === "unica" || pregunta.tipo === "multiple";

  const fuenteCondicion =
    anteriores.find((p) => p.id === pregunta.condicion?.pregunta) ?? null;
  const fuenteOpciones =
    anteriores.find((p) => p.id === pregunta.opcionesSegun?.pregunta) ?? null;

  const quitarReglas = () => onCambiar({ condicion: null, opcionesSegun: null });

  if (anteriores.length === 0) {
    return (
      <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
        <p className="text-xs text-muted">
          Para condicionar esta pregunta necesitas antes una de opción única o múltiple.
        </p>
        {hayReglas && <Roto onQuitar={quitarReglas} />}
      </div>
    );
  }

  function activarCondicion(activa: boolean) {
    if (!activa) {
      onCambiar({ condicion: null });
      return;
    }
    const condicion: Condicion = { pregunta: anteriores[0].id, valores: [] };
    onCambiar({ condicion });
  }

  function marcarValor(valor: string, marcado: boolean) {
    if (!pregunta.condicion) return;
    const valores = marcado
      ? [...pregunta.condicion.valores, valor]
      : pregunta.condicion.valores.filter((v) => v !== valor);
    onCambiar({ condicion: { ...pregunta.condicion, valores } });
  }

  function activarOpciones(activa: boolean) {
    if (!activa) {
      onCambiar({ opcionesSegun: null });
      return;
    }
    const regla: OpcionesSegun = {
      pregunta: anteriores[0].id,
      grupos: [{ cuando: [], opciones: [] }],
    };
    onCambiar({ opcionesSegun: regla });
  }

  function cambiarGrupo(indice: number, cambios: Partial<GrupoOpciones>) {
    if (!pregunta.opcionesSegun) return;
    const grupos = pregunta.opcionesSegun.grupos.map((g, i) =>
      i === indice ? { ...g, ...cambios } : g,
    );
    onCambiar({ opcionesSegun: { ...pregunta.opcionesSegun, grupos } });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-ink/10 pt-4">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex items-center gap-2 self-start text-sm font-medium text-brand-700 transition-colors hover:text-brand-900"
      >
        <span aria-hidden className="text-xs">
          {abierto ? "▾" : "▸"}
        </span>
        Cuándo se muestra y qué opciones ofrece
        <span className="font-normal text-muted">· {resumen(pregunta, anteriores)}</span>
      </button>

      {((pregunta.condicion && !fuenteCondicion) ||
        (pregunta.opcionesSegun && !fuenteOpciones)) && <Roto onQuitar={quitarReglas} />}

      {abierto && (
        <div className="flex flex-col gap-5 rounded-lg bg-page px-4 py-4">
          {/* Condición de visibilidad */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={pregunta.condicion !== null}
                onChange={(e) => activarCondicion(e.target.checked)}
                className="h-4 w-4"
              />
              Mostrar esta pregunta solo si respondieron algo en particular
            </label>

            {pregunta.condicion && (
              <div className="flex flex-col gap-3 pl-6">
                <label className={labelClass}>
                  En la pregunta
                  <select
                    value={pregunta.condicion.pregunta}
                    onChange={(e) =>
                      onCambiar({
                        condicion: { pregunta: e.target.value, valores: [] },
                      })
                    }
                    className={inputClass}
                  >
                    {anteriores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.texto || p.id}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-ink">
                    marcaron alguna de estas opciones
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {(fuenteCondicion ? opcionesPosibles(fuenteCondicion) : []).map(
                      (opcion) => (
                        <label
                          key={opcion}
                          className="flex items-center gap-2 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={pregunta.condicion!.valores.includes(opcion)}
                            onChange={(e) => marcarValor(opcion, e.target.checked)}
                            className="h-4 w-4"
                          />
                          {opcion}
                        </label>
                      ),
                    )}
                  </div>
                  {pregunta.condicion.valores.length === 0 && (
                    <p className="text-xs text-amber-700">
                      Marca al menos una opción: mientras no marques ninguna, la regla
                      no se guarda y la pregunta se le muestra a todo el mundo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Opciones según una respuesta anterior */}
          {puedeTenerOpciones && (
            <div className="flex flex-col gap-3 border-t border-ink/10 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={pregunta.opcionesSegun !== null}
                  onChange={(e) => activarOpciones(e.target.checked)}
                  className="h-4 w-4"
                />
                Cambiar las opciones según una respuesta anterior
              </label>

              {pregunta.opcionesSegun && (
                <div className="flex flex-col gap-4 pl-6">
                  <label className={labelClass}>
                    Según lo que respondan en
                    <select
                      value={pregunta.opcionesSegun.pregunta}
                      onChange={(e) =>
                        onCambiar({
                          opcionesSegun: {
                            pregunta: e.target.value,
                            grupos: [{ cuando: [], opciones: [] }],
                          },
                        })
                      }
                      className={inputClass}
                    >
                      {anteriores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.texto || p.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  {pregunta.opcionesSegun.grupos.map((grupo, indice) => (
                    <div
                      key={indice}
                      className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-surface px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Grupo {indice + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onCambiar({
                              opcionesSegun: {
                                ...pregunta.opcionesSegun!,
                                grupos: pregunta.opcionesSegun!.grupos.filter(
                                  (_, i) => i !== indice,
                                ),
                              },
                            })
                          }
                          className="text-xs font-medium text-red-700 hover:underline"
                        >
                          Quitar grupo
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-ink">
                          Si respondieron
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {(fuenteOpciones ? opcionesPosibles(fuenteOpciones) : []).map(
                            (opcion) => (
                              <label
                                key={opcion}
                                className="flex items-center gap-2 text-sm text-ink"
                              >
                                <input
                                  type="checkbox"
                                  checked={grupo.cuando.includes(opcion)}
                                  onChange={(e) =>
                                    cambiarGrupo(indice, {
                                      cuando: e.target.checked
                                        ? [...grupo.cuando, opcion]
                                        : grupo.cuando.filter((v) => v !== opcion),
                                    })
                                  }
                                  className="h-4 w-4"
                                />
                                {opcion}
                              </label>
                            ),
                          )}
                        </div>
                      </div>

                      <label className={labelClass}>
                        Mostrar estas opciones{" "}
                        <span className="font-normal text-muted">(una por línea)</span>
                        <textarea
                          rows={Math.max(3, grupo.opciones.length + 1)}
                          value={grupo.opciones.join("\n")}
                          onChange={(e) =>
                            cambiarGrupo(indice, { opciones: e.target.value.split("\n") })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      onCambiar({
                        opcionesSegun: {
                          ...pregunta.opcionesSegun!,
                          grupos: [
                            ...pregunta.opcionesSegun!.grupos,
                            { cuando: [], opciones: [] },
                          ],
                        },
                      })
                    }
                    className="w-fit rounded-md border border-ink/15 bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-page"
                  >
                    Agregar otro grupo
                  </button>

                  <p className="text-xs text-muted">
                    Si la respuesta no cae en ningún grupo se muestran las opciones
                    normales de la pregunta, las de más arriba.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Aviso cuando una regla apunta a una pregunta que ya no va antes. */
function Roto({ onQuitar }: { onQuitar: () => void }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      Esta pregunta tiene una regla que apunta a otra que ya no va antes que ella (la
      moviste o la quitaste). Así no se mostraría nunca y no se puede publicar.{" "}
      <button type="button" onClick={onQuitar} className="font-semibold underline">
        Quitar las reglas
      </button>
    </p>
  );
}

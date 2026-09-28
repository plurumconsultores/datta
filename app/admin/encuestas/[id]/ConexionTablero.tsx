"use client";

import { useState } from "react";
import {
  analizarCompatibilidad,
  type Pregunta,
  type AvisoCompatibilidad,
} from "@/lib/encuestas";
import { conectarTablero } from "../actions";

export type TableroDisponible = {
  slug: string;
  title: string;
  variables: { clave: string; etiqueta: string; valores: string[] }[];
};

/**
 * Conecta la encuesta con un tablero de Datta. Antes de guardar muestra qué
 * tan bien encajan: compara las variables que el tablero declara en su HTML
 * con los identificadores de las preguntas. Y pide confirmación, porque
 * conectar cambia lo que ve la gente en un tablero que ya está publicado.
 */
export function ConexionTablero({
  encuestaId,
  preguntas,
  tableros,
  conectadoInicial,
}: {
  encuestaId: string;
  preguntas: Pregunta[];
  tableros: TableroDisponible[];
  conectadoInicial: string | null;
}) {
  const [conectado, setConectado] = useState<string | null>(conectadoInicial);
  const [elegido, setElegido] = useState<string>(conectadoInicial ?? "");
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tablero = tableros.find((t) => t.slug === elegido) ?? null;
  const avisos: AvisoCompatibilidad[] = tablero
    ? analizarCompatibilidad(preguntas, tablero.variables)
    : [];
  const errores = avisos.filter((a) => a.nivel === "error");
  const hayCambio = (elegido || null) !== conectado;

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await conectarTablero(encuestaId, elegido === "" ? null : elegido);
      setConectado(elegido === "" ? null : elegido);
      setConfirmando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la conexión.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-ink">Tablero que alimenta</h2>
        <p className="mt-1 text-sm text-muted">
          El tablero elegido puede leer las respuestas de esta encuesta desde{" "}
          <code className="font-mono text-xs">/api/encuestas/…</code>, con la sesión de
          quien lo abre. Si no eliges ninguno, las respuestas solo se ven aquí.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink sm:max-w-md">
        Tablero
        <select
          value={elegido}
          onChange={(e) => {
            setElegido(e.target.value);
            setConfirmando(false);
          }}
          className="rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40"
        >
          <option value="">Ninguno</option>
          {tableros.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
      </label>

      {/* Qué tan bien encajan */}
      {tablero && (
        <div className="flex flex-col gap-2">
          {avisos.length === 0 ? (
            <p className="rounded-lg border border-brand-400/40 bg-brand-400/10 px-4 py-3 text-sm text-ink">
              Las variables del tablero coinciden con las preguntas de la encuesta.
            </p>
          ) : (
            avisos.map((aviso, i) => (
              <p
                key={i}
                className={
                  aviso.nivel === "error"
                    ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    : "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                }
              >
                {aviso.texto}
              </p>
            ))
          )}

          {errores.length > 0 && (
            <p className="text-xs text-muted">
              Puedes conectarlo igual, pero el tablero va a buscar datos que la encuesta
              no tiene. Revisa los identificadores de las preguntas, más abajo.
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Ventana de seguridad */}
      {confirmando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-ink/15 bg-page px-4 py-4">
          <p className="text-sm text-ink">
            {elegido === "" ? (
              <>
                Vas a <strong>desconectar</strong> el tablero{" "}
                <strong>{conectado}</strong>. Dejará de recibir las respuestas de esta
                encuesta.
              </>
            ) : (
              <>
                Vas a conectar esta encuesta con <strong>{tablero?.title}</strong>
                {conectado ? (
                  <>
                    {" "}
                    y a desconectar <strong>{conectado}</strong>
                  </>
                ) : null}
                . Ese tablero pasará a mostrar estas respuestas a quien tenga acceso a él.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={guardando}
              className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Sí, hacerlo"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-md border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!hayCambio}
            onClick={() => setConfirmando(true)}
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            {elegido === "" ? "Desconectar el tablero" : "Conectar este tablero"}
          </button>
          <span className="text-xs text-muted">
            {conectado
              ? `Conectada con "${conectado}".`
              : "Sin tablero conectado."}
          </span>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import {
  contrasteSobre,
  puntosDeEscala,
  type Bienvenida,
  type Despedida,
  type Pregunta,
  type Tema,
} from "@/lib/encuestas";

type Datos = {
  titulo: string;
  slug: string;
  bienvenida: Bienvenida;
  preguntas: Pregunta[];
  despedida: Despedida;
  tema: Tema;
  clienteNombre: string | null;
  clienteLogo: string | null;
};

type Respuestas = Record<string, string | string[] | number>;

/**
 * La encuesta tal como la ve quien responde: bienvenida, una pregunta por
 * pantalla y mensaje de cierre. Todo con los colores configurados.
 */
export function EncuestaPublica({ encuesta }: { encuesta: Datos }) {
  const [pantalla, setPantalla] = useState<"bienvenida" | "preguntas" | "fin">(
    "bienvenida",
  );
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tema, preguntas } = encuesta;
  const colorBoton = contrasteSobre(tema.principal);
  const borde = `${tema.texto}22`;
  const pregunta = preguntas[indice];

  async function enviar(finales: Respuestas) {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/e/${encuesta.slug}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas: finales }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo enviar");
      }
      setPantalla("fin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar. Revisa tu conexión e inténtalo otra vez.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function avanzar(valor: string | string[] | number) {
    const finales = { ...respuestas, [pregunta.id]: valor };
    setRespuestas(finales);

    if (indice + 1 < preguntas.length) {
      setIndice(indice + 1);
    } else {
      enviar(finales);
    }
  }

  const avance =
    pantalla === "preguntas" ? (indice / Math.max(preguntas.length, 1)) * 100 : 0;

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: tema.fondo, color: tema.texto }}
    >
      {/* Barra de avance */}
      <div className="h-1.5 w-full" style={{ backgroundColor: `${tema.texto}14` }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${avance}%`, backgroundColor: tema.principal }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8">
        <header className="flex items-center gap-3">
          {encuesta.clienteLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={encuesta.clienteLogo}
              alt={encuesta.clienteNombre ?? ""}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <span className="text-sm font-semibold opacity-70">
              {encuesta.clienteNombre ?? "Plurum"}
            </span>
          )}
        </header>

        {pantalla === "bienvenida" && (
          <section className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {encuesta.bienvenida.titulo}
              </h1>
              <p className="whitespace-pre-line text-lg leading-relaxed opacity-80">
                {encuesta.bienvenida.texto}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPantalla("preguntas")}
              className="w-fit rounded-xl px-6 py-3 text-base font-semibold transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: tema.principal, color: colorBoton }}
            >
              {encuesta.bienvenida.boton}
            </button>
            <p className="text-sm opacity-60">
              {preguntas.length === 1
                ? "1 pregunta"
                : `${preguntas.length} preguntas`}
            </p>
          </section>
        )}

        {pantalla === "preguntas" && pregunta && (
          <section className="flex flex-1 flex-col gap-7">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium opacity-60">
                Pregunta {indice + 1} de {preguntas.length}
              </span>
              <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
                {pregunta.texto}
              </h2>
              {!pregunta.obligatoria && (
                <span className="text-sm opacity-60">Puedes saltarla</span>
              )}
            </div>

            {pregunta.tipo === "unica" && (
              <OpcionUnica
                pregunta={pregunta}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                onElegir={avanzar}
              />
            )}

            {pregunta.tipo === "multiple" && (
              <OpcionMultiple
                pregunta={pregunta}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                inicial={(respuestas[pregunta.id] as string[]) ?? []}
                onConfirmar={avanzar}
              />
            )}

            {pregunta.tipo === "texto" && (
              <TextoAbierto
                pregunta={pregunta}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                inicial={(respuestas[pregunta.id] as string) ?? ""}
                onConfirmar={avanzar}
              />
            )}

            {pregunta.tipo === "escala" && (
              <Escala
                pregunta={pregunta}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                onElegir={avanzar}
              />
            )}

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
              {indice > 0 && (
                <button
                  type="button"
                  onClick={() => setIndice(indice - 1)}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  ← Atrás
                </button>
              )}
              {!pregunta.obligatoria && (
                <button
                  type="button"
                  onClick={() => avanzar("")}
                  className="text-sm font-medium opacity-70 underline-offset-4 hover:underline"
                >
                  Saltar esta pregunta
                </button>
              )}
              {enviando && <span className="text-sm opacity-70">Enviando…</span>}
            </div>

            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: `${tema.texto}0f` }}
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => enviar(respuestas)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: tema.principal, color: colorBoton }}
                >
                  Reintentar
                </button>
              </div>
            )}
          </section>
        )}

        {pantalla === "fin" && (
          <section className="flex flex-1 flex-col justify-center gap-4 text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{ backgroundColor: tema.principal, color: colorBoton }}
            >
              ✓
            </div>
            <h1 className="text-3xl font-semibold">{encuesta.despedida.titulo}</h1>
            <p className="whitespace-pre-line text-lg opacity-80">
              {encuesta.despedida.texto}
            </p>
          </section>
        )}

        <footer className="pt-6 text-xs opacity-50">
          {encuesta.titulo} · Plurum
        </footer>
      </div>
    </main>
  );
}

function OpcionUnica({
  pregunta,
  tema,
  borde,
  colorBoton,
  onElegir,
}: {
  pregunta: Pregunta;
  tema: Tema;
  borde: string;
  colorBoton: string;
  onElegir: (valor: string) => void;
}) {
  const [marcada, setMarcada] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {pregunta.opciones.map((opcion) => {
        const activa = marcada === opcion;
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => {
              // Se marca y se avanza con un respiro, para que se vea el clic.
              setMarcada(opcion);
              setTimeout(() => onElegir(opcion), 180);
            }}
            className="rounded-xl border px-5 py-4 text-left text-base transition-all hover:-translate-y-0.5"
            style={
              activa
                ? { backgroundColor: tema.principal, color: colorBoton, borderColor: tema.principal }
                : { borderColor: borde }
            }
          >
            {opcion}
          </button>
        );
      })}
    </div>
  );
}

function OpcionMultiple({
  pregunta,
  tema,
  borde,
  colorBoton,
  inicial,
  onConfirmar,
}: {
  pregunta: Pregunta;
  tema: Tema;
  borde: string;
  colorBoton: string;
  inicial: string[];
  onConfirmar: (valor: string[]) => void;
}) {
  const [marcadas, setMarcadas] = useState<string[]>(inicial);
  const tope = pregunta.maxOpciones;
  const lleno = tope > 0 && marcadas.length >= tope;

  return (
    <div className="flex flex-col gap-3">
      {tope > 0 && (
        <p className="text-sm opacity-70">
          Elige hasta {tope} {tope === 1 ? "opción" : "opciones"}.
        </p>
      )}

      {pregunta.opciones.map((opcion) => {
        const activa = marcadas.includes(opcion);
        return (
          <button
            key={opcion}
            type="button"
            disabled={!activa && lleno}
            onClick={() =>
              setMarcadas((actuales) =>
                activa ? actuales.filter((o) => o !== opcion) : [...actuales, opcion],
              )
            }
            className="rounded-xl border px-5 py-4 text-left text-base transition-all disabled:opacity-40"
            style={
              activa
                ? { backgroundColor: tema.principal, color: colorBoton, borderColor: tema.principal }
                : { borderColor: borde }
            }
          >
            {opcion}
          </button>
        );
      })}

      <button
        type="button"
        disabled={pregunta.obligatoria && marcadas.length === 0}
        onClick={() => onConfirmar(marcadas)}
        className="mt-2 w-fit rounded-xl px-6 py-3 text-base font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        style={{ backgroundColor: tema.principal, color: colorBoton }}
      >
        Continuar
      </button>
    </div>
  );
}

function Escala({
  pregunta,
  tema,
  borde,
  colorBoton,
  onElegir,
}: {
  pregunta: Pregunta;
  tema: Tema;
  borde: string;
  colorBoton: string;
  onElegir: (valor: number) => void;
}) {
  const [marcado, setMarcado] = useState<number | null>(null);
  const puntos = puntosDeEscala(pregunta.escala);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {puntos.map((n) => {
          const activo = marcado === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setMarcado(n);
                setTimeout(() => onElegir(n), 180);
              }}
              className="h-14 min-w-[3.5rem] flex-1 rounded-xl border text-lg font-semibold transition-all hover:-translate-y-0.5"
              style={
                activo
                  ? { backgroundColor: tema.principal, color: colorBoton, borderColor: tema.principal }
                  : { borderColor: borde }
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-sm opacity-70">
        <span>{pregunta.escala.etiquetaMin}</span>
        <span className="text-right">{pregunta.escala.etiquetaMax}</span>
      </div>
    </div>
  );
}

function TextoAbierto({
  pregunta,
  tema,
  borde,
  colorBoton,
  inicial,
  onConfirmar,
}: {
  pregunta: Pregunta;
  tema: Tema;
  borde: string;
  colorBoton: string;
  inicial: string;
  onConfirmar: (valor: string) => void;
}) {
  const [texto, setTexto] = useState(inicial);
  const tope = pregunta.maxCaracteres;
  const restantes = tope - texto.length;

  const estilo = {
    borderColor: borde,
    backgroundColor: "transparent",
    color: tema.texto,
  };

  return (
    <div className="flex flex-col gap-3">
      {pregunta.textoLargo ? (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, tope))}
          rows={5}
          placeholder="Escribe tu respuesta"
          className="w-full rounded-xl border px-4 py-3 text-base outline-none placeholder:opacity-50"
          style={estilo}
        />
      ) : (
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, tope))}
          placeholder="Escribe tu respuesta"
          className="w-full rounded-xl border px-4 py-3 text-base outline-none placeholder:opacity-50"
          style={estilo}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm opacity-60">
          {restantes < 120 ? `${restantes} caracteres disponibles` : ""}
        </span>
        <button
          type="button"
          disabled={pregunta.obligatoria && texto.trim().length === 0}
          onClick={() => onConfirmar(texto.trim())}
          className="rounded-xl px-6 py-3 text-base font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          style={{ backgroundColor: tema.principal, color: colorBoton }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  contrasteSobre,
  depurarRespuestas,
  opcionesVisibles,
  preguntaVisible,
  puntosDeEscala,
  type Bienvenida,
  type Despedida,
  type Pregunta,
  type Respuestas,
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

  /*
   * Con preguntas condicionales el camino depende de lo respondido. El índice
   * sigue siendo sobre la lista completa y la navegación salta lo que no
   * aplica: recortar la lista haría que el índice apuntara a otra pregunta
   * cada vez que cambia una respuesta.
   */
  const camino = preguntas.filter((p) => preguntaVisible(p, respuestas));
  const pregunta = preguntas[indice];
  const opciones = pregunta ? opcionesVisibles(pregunta, respuestas) : [];
  const posicion = pregunta ? camino.findIndex((p) => p.id === pregunta.id) : -1;
  const delCamino = camino.filter((p) => p.tipo !== "nota");
  const numero = pregunta
    ? delCamino.findIndex((p) => p.id === pregunta.id) + 1
    : 0;
  const cuantasPreguntas = preguntas.filter((p) => p.tipo !== "nota").length;
  const hayCondicionales = preguntas.some((p) => p.condicion !== null);

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

  /** La siguiente pantalla que aplica, o -1 si ya no queda ninguna. */
  function siguienteDesde(desde: number, base: Respuestas): number {
    for (let i = desde + 1; i < preguntas.length; i += 1) {
      if (preguntaVisible(preguntas[i], base)) return i;
    }
    return -1;
  }

  function anteriorDesde(desde: number): number {
    for (let i = desde - 1; i >= 0; i -= 1) {
      if (preguntaVisible(preguntas[i], respuestas)) return i;
    }
    return -1;
  }

  function comenzar() {
    const primera = siguienteDesde(-1, respuestas);
    if (primera === -1) {
      enviar(respuestas);
      return;
    }
    setIndice(primera);
    setPantalla("preguntas");
  }

  function seguir(finales: Respuestas) {
    const proxima = siguienteDesde(indice, finales);
    if (proxima === -1) enviar(finales);
    else setIndice(proxima);
  }

  function avanzar(valor: string | string[] | number) {
    /*
     * Se depura antes de seguir: si alguien volvió atrás y cambió la
     * respuesta que abría una rama, lo que había contestado en esa rama no se
     * guarda ni se envía.
     */
    const finales = depurarRespuestas(preguntas, {
      ...respuestas,
      [pregunta.id]: valor,
    });
    setRespuestas(finales);
    seguir(finales);
  }

  const avance =
    pantalla === "fin"
      ? 100
      : pantalla === "preguntas" && posicion >= 0
        ? (posicion / Math.max(camino.length, 1)) * 100
        : 0;

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
              onClick={comenzar}
              className="w-fit rounded-xl px-6 py-3 text-base font-semibold transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: tema.principal, color: colorBoton }}
            >
              {encuesta.bienvenida.boton}
            </button>
            <p className="text-sm opacity-60">
              {cuantasPreguntas === 1 ? "1 pregunta" : `${cuantasPreguntas} preguntas`}
              {hayCondicionales && " · algunas dependen de tus respuestas"}
            </p>
          </section>
        )}

        {pantalla === "preguntas" && pregunta && pregunta.tipo === "nota" && (
          <section className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex flex-col gap-4">
              {pregunta.texto && (
                <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
                  {pregunta.texto}
                </h2>
              )}
              <p className="whitespace-pre-line text-lg leading-relaxed opacity-80">
                {pregunta.descripcion}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => seguir(respuestas)}
                className="w-fit rounded-xl px-6 py-3 text-base font-semibold transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: tema.principal, color: colorBoton }}
              >
                Continuar
              </button>
              {anteriorDesde(indice) !== -1 && (
                <button
                  type="button"
                  onClick={() => setIndice(anteriorDesde(indice))}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  ← Atrás
                </button>
              )}
              {enviando && <span className="text-sm opacity-70">Enviando…</span>}
            </div>
          </section>
        )}

        {pantalla === "preguntas" && pregunta && pregunta.tipo !== "nota" && (
          <section className="flex flex-1 flex-col gap-7">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium opacity-60">
                Pregunta {numero} de {delCamino.length}
              </span>
              <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
                {pregunta.texto}
              </h2>
              {pregunta.descripcion && (
                <p className="whitespace-pre-line text-base leading-relaxed opacity-70">
                  {pregunta.descripcion}
                </p>
              )}
              {!pregunta.obligatoria && (
                <span className="text-sm opacity-60">Puedes saltarla</span>
              )}
            </div>

            {pregunta.tipo === "unica" && (
              <OpcionUnica
                key={pregunta.id}
                pregunta={pregunta}
                opciones={opciones}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                onElegir={avanzar}
              />
            )}

            {pregunta.tipo === "multiple" && (
              <OpcionMultiple
                key={pregunta.id}
                pregunta={pregunta}
                opciones={opciones}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                inicial={(respuestas[pregunta.id] as string[]) ?? []}
                onConfirmar={avanzar}
              />
            )}

            {pregunta.tipo === "texto" && (
              <TextoAbierto
                key={pregunta.id}
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
                key={pregunta.id}
                pregunta={pregunta}
                tema={tema}
                borde={borde}
                colorBoton={colorBoton}
                onElegir={avanzar}
              />
            )}

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
              {anteriorDesde(indice) !== -1 && (
                <button
                  type="button"
                  onClick={() => setIndice(anteriorDesde(indice))}
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
  opciones,
  tema,
  borde,
  colorBoton,
  onElegir,
}: {
  pregunta: Pregunta;
  /** Las que aplican según lo respondido antes, no siempre todas las suyas. */
  opciones: string[];
  tema: Tema;
  borde: string;
  colorBoton: string;
  onElegir: (valor: string) => void;
}) {
  const [marcada, setMarcada] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {opciones.map((opcion) => {
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
  opciones,
  tema,
  borde,
  colorBoton,
  inicial,
  onConfirmar,
}: {
  pregunta: Pregunta;
  opciones: string[];
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

      {opciones.map((opcion) => {
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ESCALAS_LISTAS,
  ESCALA_POR_DEFECTO,
  ETIQUETA_TIPO,
  MAX_CARACTERES,
  MAX_PUNTOS,
  TEMA_POR_DEFECTO,
  aIdentificador,
  contrasteSobre,
  esHex,
  puntosDeEscala,
  type Bienvenida,
  type Despedida,
  type Encuesta,
  type Pregunta,
  type Tema,
  type TipoPregunta,
} from "@/lib/encuestas";
import { cambiarEstado, guardarEncuesta, publicarEncuesta } from "../actions";

const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-ink";
const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";

function preguntaNueva(indice: number): Pregunta {
  return {
    id: `p${Date.now().toString(36)}${indice}`,
    texto: "",
    tipo: "unica",
    obligatoria: true,
    opciones: ["", ""],
    maxOpciones: 0,
    escala: { ...ESCALA_POR_DEFECTO },
    textoLargo: true,
    maxCaracteres: 500,
  };
}

export function EditorEncuesta({
  encuesta,
  clientes,
}: {
  encuesta: Encuesta;
  clientes: { id: string; nombre: string; color_hex: string | null }[];
}) {
  const [titulo, setTitulo] = useState(encuesta.titulo);
  const [clienteId, setClienteId] = useState(encuesta.cliente_id ?? "");
  const [bienvenida, setBienvenida] = useState<Bienvenida>(encuesta.bienvenida);
  const [preguntas, setPreguntas] = useState<Pregunta[]>(encuesta.preguntas);
  const [despedida, setDespedida] = useState<Despedida>(encuesta.despedida);
  const [tema, setTema] = useState<Tema>(encuesta.tema);
  const [estado, setEstado] = useState(encuesta.estado);
  const [guardado, setGuardado] = useState<"al-dia" | "guardando" | "error">("al-dia");
  const [aviso, setAviso] = useState<string | null>(null);
  const primeraVez = useRef(true);

  const colorDelCliente =
    clientes.find((c) => c.id === clienteId)?.color_hex ?? null;

  /*
   * Guardado automático: se espera a que dejes de escribir un segundo y medio
   * y se manda la definición completa. Menos fricción que un botón "guardar"
   * que la gente olvida.
   */
  const guardar = useCallback(async () => {
    setGuardado("guardando");
    try {
      await guardarEncuesta(encuesta.id, {
        titulo,
        cliente_id: clienteId === "" ? null : clienteId,
        bienvenida,
        preguntas,
        despedida,
        tema,
      });
      setGuardado("al-dia");
    } catch (err) {
      setGuardado("error");
      setAviso(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }, [encuesta.id, titulo, clienteId, bienvenida, preguntas, despedida, tema]);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const reloj = setTimeout(guardar, 1500);
    return () => clearTimeout(reloj);
  }, [guardar]);

  function cambiarPregunta(indice: number, cambios: Partial<Pregunta>) {
    setPreguntas((actuales) =>
      actuales.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
    );
  }

  function moverPregunta(indice: number, direccion: -1 | 1) {
    setPreguntas((actuales) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= actuales.length) return actuales;
      const copia = [...actuales];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  async function publicar() {
    setAviso(null);
    try {
      await guardar();
      await publicarEncuesta(encuesta.id);
      setEstado("publicada");
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo publicar.");
    }
  }

  async function cerrarOAbrir(nuevo: "publicada" | "cerrada") {
    setAviso(null);
    try {
      await cambiarEstado(encuesta.id, nuevo);
      setEstado(nuevo);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {aviso && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {aviso}
        </p>
      )}

      {/* Datos generales */}
      <section className={`${cardClass} flex flex-col gap-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Datos de la encuesta</h2>
          <span className="text-xs text-muted">
            {guardado === "guardando"
              ? "Guardando…"
              : guardado === "error"
                ? "Sin guardar"
                : "Guardado"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Título
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Cliente
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputClass}
            >
              <option value="">Interno</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-muted">
              Su logo y su color se usan en la portada de la encuesta.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
          {estado === "publicada" ? (
            <>
              <span className="rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-medium text-white">
                Publicada
              </span>
              <button
                type="button"
                onClick={() => cerrarOAbrir("cerrada")}
                className="rounded-md border border-ink/15 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-page"
              >
                Cerrar la encuesta
              </button>
            </>
          ) : estado === "cerrada" ? (
            <>
              <span className="rounded-full border border-ink/20 bg-page px-2.5 py-0.5 text-xs font-medium text-ink">
                Cerrada
              </span>
              <button
                type="button"
                onClick={() => cerrarOAbrir("publicada")}
                className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Volver a abrirla
              </button>
            </>
          ) : (
            <>
              <span className="rounded-full border border-ink/20 px-2.5 py-0.5 text-xs font-medium text-muted">
                Borrador
              </span>
              <button
                type="button"
                onClick={publicar}
                className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Publicar
              </button>
              <span className="text-xs text-muted">
                Al publicar se crea su tabla de respuestas y el enlace queda activo.
              </span>
            </>
          )}
        </div>
      </section>

      {/* Colores */}
      <section className={`${cardClass} flex flex-col gap-4`}>
        <h2 className="text-base font-semibold text-ink">Colores de la encuesta</h2>
        <p className="-mt-2 text-sm text-muted">
          Con estos se dibuja la página que ve quien responde.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CampoColor
            etiqueta="Principal"
            ayuda="Botones, opción marcada y barra de avance"
            valor={tema.principal}
            onCambiar={(principal) => setTema({ ...tema, principal })}
          />
          <CampoColor
            etiqueta="Fondo"
            ayuda="Fondo de la página"
            valor={tema.fondo}
            onCambiar={(fondo) => setTema({ ...tema, fondo })}
          />
          <CampoColor
            etiqueta="Texto"
            ayuda="Preguntas y mensajes"
            valor={tema.texto}
            onCambiar={(texto) => setTema({ ...tema, texto })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {colorDelCliente && (
            <button
              type="button"
              onClick={() => setTema({ ...tema, principal: colorDelCliente })}
              className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-page"
            >
              Usar el color del cliente
            </button>
          )}
          <button
            type="button"
            onClick={() => setTema({ ...TEMA_POR_DEFECTO })}
            className="rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-page"
          >
            Volver a los de Plurum
          </button>
        </div>

        {/* Vista previa */}
        <div
          className="flex flex-col gap-3 rounded-xl border border-ink/10 p-5"
          style={{ backgroundColor: tema.fondo, color: tema.texto }}
        >
          <span className="text-xs uppercase tracking-wide opacity-60">
            Así se verá
          </span>
          <p className="text-lg font-semibold">
            ¿Qué tan de acuerdo estás con esta afirmación?
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{
                backgroundColor: tema.principal,
                color: contrasteSobre(tema.principal),
              }}
            >
              Totalmente de acuerdo
            </span>
            <span
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: `${tema.texto}33` }}
            >
              De acuerdo
            </span>
            <span
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: `${tema.texto}33` }}
            >
              En desacuerdo
            </span>
          </div>
          <span
            className="mt-1 block h-1.5 w-2/3 rounded-full"
            style={{ backgroundColor: tema.principal }}
          />
        </div>
      </section>

      {/* Bienvenida */}
      <section className={`${cardClass} flex flex-col gap-4`}>
        <h2 className="text-base font-semibold text-ink">Mensaje de bienvenida</h2>
        <p className="-mt-2 text-sm text-muted">
          Lo primero que ve quien abre el enlace, antes de las preguntas.
        </p>

        <label className={labelClass}>
          Título
          <input
            value={bienvenida.titulo}
            onChange={(e) => setBienvenida({ ...bienvenida, titulo: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Texto
          <textarea
            rows={4}
            value={bienvenida.texto}
            onChange={(e) => setBienvenida({ ...bienvenida, texto: e.target.value })}
            className={inputClass}
          />
          <span className="text-xs font-normal text-muted">
            Buen lugar para decir cuánto tarda, para qué es y si es anónima.
          </span>
        </label>

        <label className={`${labelClass} sm:w-64`}>
          Texto del botón
          <input
            value={bienvenida.boton}
            onChange={(e) => setBienvenida({ ...bienvenida, boton: e.target.value })}
            className={inputClass}
          />
        </label>
      </section>

      {/* Preguntas */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Preguntas ({preguntas.length})
          </h2>
          <button
            type="button"
            onClick={() =>
              setPreguntas((actuales) => [...actuales, preguntaNueva(actuales.length)])
            }
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Agregar pregunta
          </button>
        </div>

        {preguntas.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-10 text-center text-sm text-muted">
            Todavía no hay preguntas.
          </p>
        )}

        {preguntas.map((pregunta, indice) => (
          <EditorPregunta
            key={pregunta.id}
            pregunta={pregunta}
            indice={indice}
            total={preguntas.length}
            onCambiar={(cambios) => cambiarPregunta(indice, cambios)}
            onMover={(direccion) => moverPregunta(indice, direccion)}
            onQuitar={() =>
              setPreguntas((actuales) => actuales.filter((_, i) => i !== indice))
            }
          />
        ))}
      </section>

      {/* Despedida */}
      <section className={`${cardClass} flex flex-col gap-4`}>
        <h2 className="text-base font-semibold text-ink">Mensaje de cierre</h2>
        <p className="-mt-2 text-sm text-muted">
          Lo que ve la persona cuando termina de responder.
        </p>

        <label className={labelClass}>
          Título
          <input
            value={despedida.titulo}
            onChange={(e) => setDespedida({ ...despedida, titulo: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Texto
          <textarea
            rows={3}
            value={despedida.texto}
            onChange={(e) => setDespedida({ ...despedida, texto: e.target.value })}
            className={inputClass}
          />
        </label>
      </section>
    </div>
  );
}

function EditorPregunta({
  pregunta,
  indice,
  total,
  onCambiar,
  onMover,
  onQuitar,
}: {
  pregunta: Pregunta;
  indice: number;
  total: number;
  onCambiar: (cambios: Partial<Pregunta>) => void;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
}) {
  const esEscala = pregunta.tipo === "escala";
  const esTexto = pregunta.tipo === "texto";

  /** Con cuál de las escalas listas coincide la que está puesta. */
  const preajuste =
    Object.entries(ESCALAS_LISTAS).find(
      ([, e]) =>
        e.min === pregunta.escala.min &&
        e.max === pregunta.escala.max &&
        e.etiquetaMin === pregunta.escala.etiquetaMin &&
        e.etiquetaMax === pregunta.escala.etiquetaMax,
    )?.[0] ?? "personalizada";

  return (
    <div className={`${cardClass} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Pregunta {indice + 1} · {ETIQUETA_TIPO[pregunta.tipo]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMover(-1)}
            disabled={indice === 0}
            aria-label="Subir"
            className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-page disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMover(1)}
            disabled={indice === total - 1}
            aria-label="Bajar"
            className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-page disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onQuitar}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Quitar
          </button>
        </div>
      </div>

      <label className={labelClass}>
        Pregunta
        <textarea
          rows={2}
          value={pregunta.texto}
          onChange={(e) => onCambiar({ texto: e.target.value })}
          placeholder="¿Qué tan de acuerdo estás con…?"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Identificador{" "}
        <span className="font-normal text-muted">(con este nombre la busca un tablero)</span>
        <input
          value={pregunta.id}
          onChange={(e) => onCambiar({ id: aIdentificador(e.target.value) })}
          spellCheck={false}
          className={`${inputClass} font-mono sm:max-w-xs`}
        />
        <span className="text-xs font-normal text-muted">
          Cámbialo antes de recoger respuestas: las que ya estén guardadas conservan el
          identificador viejo.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <label className={labelClass}>
          Tipo de pregunta
          <select
            value={pregunta.tipo}
            onChange={(e) => onCambiar({ tipo: e.target.value as TipoPregunta })}
            className={inputClass}
          >
            <option value="unica">Opción única</option>
            <option value="multiple">Opción múltiple</option>
            <option value="escala">Escala</option>
            <option value="texto">Texto abierto</option>
          </select>
        </label>

        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={pregunta.obligatoria}
            onChange={(e) => onCambiar({ obligatoria: e.target.checked })}
            className="h-4 w-4"
          />
          Obligatoria
        </label>
      </div>

      {esTexto ? (
        <div className="flex flex-col gap-4 border-t border-ink/10 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={pregunta.textoLargo}
                onChange={(e) => onCambiar({ textoLargo: e.target.checked })}
                className="h-4 w-4"
              />
              Caja de varias líneas
            </label>

            <label className={labelClass}>
              Máximo de caracteres
              <input
                type="number"
                min={20}
                max={MAX_CARACTERES}
                value={pregunta.maxCaracteres}
                onChange={(e) => onCambiar({ maxCaracteres: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
          </div>

          <p className="text-xs text-muted">
            Las respuestas abiertas no se pueden agrupar solas: se leen una por una o se
            descargan en el CSV. Un tablero conectado tampoco puede contarlas por
            categorías.
          </p>
        </div>
      ) : esEscala ? (
        <div className="flex flex-col gap-4 border-t border-ink/10 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Escala
              <select
                value={preajuste}
                onChange={(e) => {
                  const lista = ESCALAS_LISTAS[e.target.value];
                  if (lista) onCambiar({ escala: { ...lista } });
                }}
                className={inputClass}
              >
                <option value="likert">Likert · 1 a 5 (acuerdo)</option>
                <option value="frecuencia">Frecuencia · 1 a 5</option>
                <option value="plurum">Plurum · 1 a 10</option>
                <option value="cerodiez">0 a 10</option>
                <option value="personalizada">Personalizada</option>
              </select>
            </label>
            <label className={labelClass}>
              Desde
              <input
                type="number"
                min={-10}
                max={100}
                value={pregunta.escala.min}
                onChange={(e) =>
                  onCambiar({
                    escala: { ...pregunta.escala, min: Number(e.target.value) },
                  })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Hasta
              <input
                type="number"
                min={-9}
                max={100}
                value={pregunta.escala.max}
                onChange={(e) =>
                  onCambiar({
                    escala: { ...pregunta.escala, max: Number(e.target.value) },
                  })
                }
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Etiqueta del extremo bajo
              <input
                value={pregunta.escala.etiquetaMin}
                onChange={(e) =>
                  onCambiar({
                    escala: { ...pregunta.escala, etiquetaMin: e.target.value },
                  })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Etiqueta del extremo alto
              <input
                value={pregunta.escala.etiquetaMax}
                onChange={(e) =>
                  onCambiar({
                    escala: { ...pregunta.escala, etiquetaMax: e.target.value },
                  })
                }
                className={inputClass}
              />
            </label>
          </div>

          <p className="-mt-2 text-xs text-muted">
            {puntosDeEscala(pregunta.escala).length} puntos. Se puede empezar en 0 (por
            ejemplo 0 a 10) y llegar hasta {MAX_PUNTOS} botones.
          </p>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-page px-4 py-3">
            <span className="text-xs text-muted">{pregunta.escala.etiquetaMin}</span>
            {puntosDeEscala(pregunta.escala).map((n) => (
              <span
                key={n}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15 bg-surface text-sm font-medium text-ink"
              >
                {n}
              </span>
            ))}
            <span className="text-xs text-muted">{pregunta.escala.etiquetaMax}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-t border-ink/10 pt-4">
          <label className={labelClass}>
            Opciones <span className="font-normal text-muted">(una por línea)</span>
            <textarea
              rows={Math.max(3, pregunta.opciones.length + 1)}
              value={pregunta.opciones.join("\n")}
              onChange={(e) => onCambiar({ opciones: e.target.value.split("\n") })}
              className={inputClass}
            />
          </label>

          {pregunta.tipo === "multiple" && (
            <label className={`${labelClass} sm:w-64`}>
              Máximo de opciones marcables
              <input
                type="number"
                min={0}
                value={pregunta.maxOpciones}
                onChange={(e) => onCambiar({ maxOpciones: Number(e.target.value) })}
                className={inputClass}
              />
              <span className="text-xs font-normal text-muted">
                0 = sin tope.
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

/** Un color: selector, hex escribible y muestra. */
function CampoColor({
  etiqueta,
  ayuda,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  ayuda: string;
  valor: string;
  onCambiar: (hex: string) => void;
}) {
  const [texto, setTexto] = useState(valor);

  return (
    <label className={labelClass}>
      {etiqueta}
      <span className="flex items-center gap-2 rounded-md border border-ink/15 bg-surface px-2 py-1.5">
        <input
          type="color"
          value={valor}
          onChange={(e) => {
            const hex = e.target.value.toUpperCase();
            setTexto(hex);
            onCambiar(hex);
          }}
          aria-label={`Elegir color ${etiqueta.toLowerCase()}`}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (esHex(e.target.value)) onCambiar(e.target.value.toUpperCase());
          }}
          onBlur={() => setTexto(valor)}
          spellCheck={false}
          className="w-full min-w-0 bg-transparent font-mono text-sm text-ink outline-none"
        />
      </span>
      <span className="text-xs font-normal text-muted">{ayuda}</span>
    </label>
  );
}

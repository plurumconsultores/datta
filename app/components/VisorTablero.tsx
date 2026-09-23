"use client";

import { useEffect, useRef, useState } from "react";

/** El isotipo de Plurum, en SVG, para poder animarle los ojos por separado. */
function IsotipoPlurum({
  className,
  style,
  animada = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** true solo en la carita: gira y guiña. Las marcas de agua no. */
  animada?: boolean;
}) {
  const giro = useRef<SVGAnimateTransformElement>(null);
  const parpado = useRef<SVGAnimateElement>(null);

  /*
   * Las animaciones del SVG corren con el reloj de la página, así que si el
   * tablero se abre a mitad del ciclo la carita aparecería ya girada. Por eso
   * ambas quedan en espera (begin="indefinite") y se disparan juntas aquí, al
   * aparecer la pantalla: siempre empieza derecha y el guiño siempre cae con
   * la carita girada.
   */
  useEffect(() => {
    if (!animada) return;
    try {
      giro.current?.beginElement();
      parpado.current?.beginElement();
    } catch {
      // Navegador que no deja dispararlas a mano: corren con el reloj normal.
    }
  }, [animada]);

  return (
    <svg
      viewBox="0 0 97.49 94.67"
      aria-hidden
      className={className}
      style={style}
    >
      {/*
        El giro y el guiño son animaciones del propio SVG, con el mismo reloj:
        si el giro lo llevara el CSS, al montarse la pantalla cada uno
        arrancaría en un punto distinto y la carita guiñaría estando derecha.
        El giro cuelga de este <g> y no del <svg>: así es un giro sobre el
        centro del dibujo, sin desplazarlo.
      */}
      <g>
        {animada && (
          <animateTransform
            ref={giro}
            begin="indefinite"
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            dur="5.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.1;0.24;0.76;0.9;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values="0 48.5 47.2;0 48.5 47.2;90 48.5 47.2;90 48.5 47.2;0 48.5 47.2;0 48.5 47.2"
          />
        )}
      <path
        className="iso-cuerpo"
        d="M36.31,20.38h6.55v5.96h.15c3.12-4.51,8.8-6.84,14.4-6.84,10.69,0,19.71,8.51,19.71,19.41,0,11.93-9.46,20.22-20,20.22-6.55,0-11.34-2.77-14.11-6.69h-.15v21.81h-6.55V20.38Zm19.92,5.24c-7.12,0-13.38,6.11-13.38,13.74s6.11,13.67,13.6,13.67c6.91,0,13.67-5.31,13.67-14.03,0-6.33-5.01-13.38-13.89-13.38"
      />
      <path
        className="iso-ojo iso-ojo-a"
        d="M30.55,29.12c0,2.82-2.29,5.1-5.1,5.1s-5.1-2.28-5.1-5.1,2.29-5.09,5.1-5.09,5.1,2.27,5.1,5.09"
      />
      {/*
        El ojo que guiña. Las dos figuras —el punto y el ">"— están dibujadas
        con la misma cantidad de curvas, así que el navegador puede
        interpolarlas: el punto se deforma hasta volverse el símbolo y
        regresa. El ">" va dibujado como "∧" porque la carita está girada un
        cuarto de vuelta.
      */}
      <path className="iso-ojo iso-ojo-b" d="M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z">
        {animada && (
          <animate
            ref={parpado}
            begin="indefinite"
            attributeName="d"
            dur="5.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.38;0.46;0.56;0.64;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values="M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,43.90C27.58,46.92 29.72,49.95 31.85,52.97C31.10,53.59 30.35,54.20 29.60,54.82C28.22,52.64 26.83,50.46 25.45,48.27C24.07,50.46 22.68,52.64 21.30,54.82C20.55,54.20 19.80,53.59 19.05,52.97C21.18,49.95 23.32,46.92 25.45,43.90Z;M25.45,43.90C27.58,46.92 29.72,49.95 31.85,52.97C31.10,53.59 30.35,54.20 29.60,54.82C28.22,52.64 26.83,50.46 25.45,48.27C24.07,50.46 22.68,52.64 21.30,54.82C20.55,54.20 19.80,53.59 19.05,52.97C21.18,49.95 23.32,46.92 25.45,43.90Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z"
          />
        )}
      </path>
      </g>
    </svg>
  );
}

/**
 * Isotipos de fondo: entran por la derecha, cruzan despacio hacia la
 * izquierda creciendo, y se difuminan hasta desaparecer.
 */
/**
 * Lo que tarda la carita en girar, guiñar y volver a su posición: la pantalla
 * se queda al menos ese tiempo, para que el gesto no se corte a la mitad.
 * Tiene que coincidir con la animación carga-girar de globals.css.
 */
const CICLO_CARITA = 5200;

const SELLOS = [
  { top: "4%", tamano: 190, giro: "-12deg", opacidad: 0.14, retraso: "0s", duracion: "26s" },
  { top: "12%", tamano: 110, giro: "22deg", opacidad: 0.09, retraso: "-19s", duracion: "31s" },
  { top: "20%", tamano: 150, giro: "18deg", opacidad: 0.12, retraso: "-4s", duracion: "30s" },
  { top: "27%", tamano: 90, giro: "-30deg", opacidad: 0.08, retraso: "-11s", duracion: "21s" },
  { top: "34%", tamano: 210, giro: "-4deg", opacidad: 0.11, retraso: "-22s", duracion: "35s" },
  { top: "41%", tamano: 120, giro: "12deg", opacidad: 0.1, retraso: "-6s", duracion: "24s" },
  { top: "48%", tamano: 250, giro: "8deg", opacidad: 0.1, retraso: "-7s", duracion: "34s" },
  { top: "55%", tamano: 100, giro: "-18deg", opacidad: 0.09, retraso: "-27s", duracion: "28s" },
  { top: "60%", tamano: 170, giro: "-22deg", opacidad: 0.13, retraso: "-13s", duracion: "25s" },
  { top: "68%", tamano: 130, giro: "30deg", opacidad: 0.11, retraso: "-18s", duracion: "22s" },
  { top: "74%", tamano: 200, giro: "5deg", opacidad: 0.1, retraso: "-2s", duracion: "33s" },
  { top: "81%", tamano: 110, giro: "-9deg", opacidad: 0.09, retraso: "-15s", duracion: "27s" },
  { top: "88%", tamano: 160, giro: "24deg", opacidad: 0.12, retraso: "-9s", duracion: "23s" },
  { top: "-6%", tamano: 140, giro: "-26deg", opacidad: 0.1, retraso: "-24s", duracion: "29s" },
];

/**
 * Marco del tablero: el iframe y, encima, la pantalla de carga de Plurum
 * mientras el contenido termina de llegar. Los tableros pesan varios megas,
 * así que sin esto el usuario se queda mirando un rectángulo en blanco.
 */
export function VisorTablero({
  src,
  titulo,
  esPowerBi,
  clienteNombre,
  clienteLogo,
  color,
}: {
  src: string | undefined;
  titulo: string;
  esPowerBi: boolean;
  clienteNombre: string | null;
  clienteLogo: string | null;
  color: string;
}) {
  const [listo, setListo] = useState(false);
  const [minimoCumplido, setMinimoCumplido] = useState(false);
  const [visible, setVisible] = useState(true);

  // Mínimo en pantalla: un ciclo completo de la carita. Si el tablero carga
  // antes, igual se ve el gesto entero en vez de un parpadeo.
  useEffect(() => {
    const reloj = setTimeout(() => setMinimoCumplido(true), CICLO_CARITA);
    return () => clearTimeout(reloj);
  }, []);

  // Salvavidas: si el iframe nunca avisa que cargó (un embed que se queda
  // colgado, por ejemplo), la pantalla no se queda puesta para siempre.
  useEffect(() => {
    const reloj = setTimeout(() => setListo(true), 25000);
    return () => clearTimeout(reloj);
  }, []);

  const cargado = listo && minimoCumplido;

  // Se desvanece antes de quitarse del todo.
  useEffect(() => {
    if (!cargado) return;
    const reloj = setTimeout(() => setVisible(false), 420);
    return () => clearTimeout(reloj);
  }, [cargado]);

  return (
    <div className="relative h-full w-full">
      {esPowerBi ? (
        <iframe
          src={src}
          title={titulo}
          onLoad={() => setListo(true)}
          className="h-full w-full border-0"
          allowFullScreen
        />
      ) : (
        <iframe
          src={src}
          title={titulo}
          onLoad={() => setListo(true)}
          // Aislamos el contenido nativo: permitimos scripts pero NO
          // allow-same-origin, para que no acceda a las cookies ni al origen.
          sandbox="allow-scripts allow-same-origin allow-downloads"
          className="h-full w-full border-0 bg-white"
        />
      )}

      {visible && (
        <PantallaCarga
          titulo={titulo}
          clienteNombre={clienteNombre}
          clienteLogo={clienteLogo}
          color={color}
          desvanecer={cargado}
        />
      )}
    </div>
  );
}

function PantallaCarga({
  titulo,
  clienteNombre,
  clienteLogo,
  color,
  desvanecer,
}: {
  titulo: string;
  clienteNombre: string | null;
  clienteLogo: string | null;
  color: string;
  desvanecer: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`carga-fondo absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        desvanecer ? "opacity-0" : "opacity-100"
      }`}
    >
      {SELLOS.map((sello, i) => (
        <IsotipoPlurum
          key={i}
          className="carga-sello"
          style={{
            top: sello.top,
            width: sello.tamano,
            animationDelay: sello.retraso,
            animationDuration: sello.duracion,
            ["--giro" as string]: sello.giro,
            ["--op" as string]: sello.opacidad,
          }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        {clienteLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clienteLogo}
            alt={clienteNombre ?? ""}
            className="h-28 w-auto max-w-[380px] rounded-2xl bg-white/95 object-contain p-5 shadow-xl sm:h-32"
          />
        )}
        <h2 className="max-w-xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          {titulo}
        </h2>
      </div>

      <div className="absolute bottom-12 flex w-full max-w-xs flex-col items-center gap-4 px-6">
        {/* El isotipo gira hasta quedar como carita, guiña y vuelve. */}
        <IsotipoPlurum className="carga-carita h-12 w-auto" animada />
        <p className="text-sm font-medium text-white/90">Cargando el tablero…</p>
        <span
          aria-hidden
          className="carga-barra"
          style={{ ["--color-cliente" as string]: color }}
        />
      </div>
    </div>
  );
}

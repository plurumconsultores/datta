/**
 * El fondo de marca del inicio de sesión: los cuatro colores de Plurum
 * relevándose y los isotipos cruzando la pantalla como marcas de agua.
 *
 * No lleva estado ni efectos, así que corre en el servidor. El giro y el
 * guiño de la carita son animaciones del propio SVG, con el reloj de la
 * página: aquí no hace falta dispararlas a mano como en el visor de tableros,
 * porque la pantalla no aparece a mitad de camino, se carga con la página.
 */

/** El isotipo, quieto. Se usa como marca de agua. */
export function IsotipoPlurum({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 97.49 94.67" aria-hidden className={className} style={style}>
      <path d="M36.31,20.38h6.55v5.96h.15c3.12-4.51,8.8-6.84,14.4-6.84,10.69,0,19.71,8.51,19.71,19.41,0,11.93-9.46,20.22-20,20.22-6.55,0-11.34-2.77-14.11-6.69h-.15v21.81h-6.55V20.38Zm19.92,5.24c-7.12,0-13.38,6.11-13.38,13.74s6.11,13.67,13.6,13.67c6.91,0,13.67-5.31,13.67-14.03,0-6.33-5.01-13.38-13.89-13.38" />
      <path d="M30.55,29.12c0,2.82-2.29,5.1-5.1,5.1s-5.1-2.28-5.1-5.1,2.29-5.09,5.1-5.09,5.1,2.27,5.1,5.09" />
      <path d="M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z" />
    </svg>
  );
}

/**
 * La carita: el isotipo gira un cuarto de vuelta —los dos puntos quedan
 * arriba como ojos—, guiña ya girada y vuelve. Es el mismo gesto de la
 * pantalla de carga de los tableros, con el mismo ciclo de 5,2 segundos.
 */
export function CaritaPlurum({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 97.49 94.67" aria-hidden className={className}>
      {/* El giro cuelga del <g> y no del <svg>: así gira sobre su centro sin
          desplazarse. */}
      <g>
        <animateTransform
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
        <path d="M36.31,20.38h6.55v5.96h.15c3.12-4.51,8.8-6.84,14.4-6.84,10.69,0,19.71,8.51,19.71,19.41,0,11.93-9.46,20.22-20,20.22-6.55,0-11.34-2.77-14.11-6.69h-.15v21.81h-6.55V20.38Zm19.92,5.24c-7.12,0-13.38,6.11-13.38,13.74s6.11,13.67,13.6,13.67c6.91,0,13.67-5.31,13.67-14.03,0-6.33-5.01-13.38-13.89-13.38" />
        <path d="M30.55,29.12c0,2.82-2.29,5.1-5.1,5.1s-5.1-2.28-5.1-5.1,2.29-5.09,5.1-5.09,5.1,2.27,5.1,5.09" />
        {/* El ojo que guiña: el punto y el ">" están dibujados con la misma
            cantidad de curvas, así que el navegador puede interpolarlos. */}
        <path d="M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z">
          <animate
            attributeName="d"
            dur="5.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.38;0.46;0.56;0.64;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values="M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,43.90C27.58,46.92 29.72,49.95 31.85,52.97C31.10,53.59 30.35,54.20 29.60,54.82C28.22,52.64 26.83,50.46 25.45,48.27C24.07,50.46 22.68,52.64 21.30,54.82C20.55,54.20 19.80,53.59 19.05,52.97C21.18,49.95 23.32,46.92 25.45,43.90Z;M25.45,43.90C27.58,46.92 29.72,49.95 31.85,52.97C31.10,53.59 30.35,54.20 29.60,54.82C28.22,52.64 26.83,50.46 25.45,48.27C24.07,50.46 22.68,52.64 21.30,54.82C20.55,54.20 19.80,53.59 19.05,52.97C21.18,49.95 23.32,46.92 25.45,43.90Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z;M25.45,44.40C27.27,44.40 28.96,45.37 29.87,46.95C30.78,48.53 30.78,50.47 29.87,52.05C28.96,53.63 27.27,54.60 25.45,54.60C23.63,54.60 21.94,53.63 21.03,52.05C20.12,50.47 20.12,48.53 21.03,46.95C21.94,45.37 23.63,44.40 25.45,44.40Z"
          />
        </path>
      </g>
    </svg>
  );
}

/** Las marcas de agua: dónde entra cada isotipo, de qué tamaño y a qué ritmo. */
const SELLOS = [
  { top: "4%", tamano: 190, giro: "-12deg", opacidad: 0.14, retraso: "0s", duracion: "38s" },
  { top: "12%", tamano: 110, giro: "22deg", opacidad: 0.09, retraso: "-19s", duracion: "45s" },
  { top: "20%", tamano: 150, giro: "18deg", opacidad: 0.12, retraso: "-4s", duracion: "44s" },
  { top: "27%", tamano: 90, giro: "-30deg", opacidad: 0.08, retraso: "-11s", duracion: "30s" },
  { top: "34%", tamano: 210, giro: "-4deg", opacidad: 0.11, retraso: "-22s", duracion: "51s" },
  { top: "41%", tamano: 120, giro: "12deg", opacidad: 0.1, retraso: "-6s", duracion: "35s" },
  { top: "48%", tamano: 250, giro: "8deg", opacidad: 0.1, retraso: "-7s", duracion: "49s" },
  { top: "55%", tamano: 100, giro: "-18deg", opacidad: 0.09, retraso: "-27s", duracion: "41s" },
  { top: "60%", tamano: 170, giro: "-22deg", opacidad: 0.13, retraso: "-13s", duracion: "36s" },
  { top: "68%", tamano: 130, giro: "30deg", opacidad: 0.11, retraso: "-18s", duracion: "32s" },
  { top: "74%", tamano: 200, giro: "5deg", opacidad: 0.1, retraso: "-2s", duracion: "48s" },
  { top: "81%", tamano: 110, giro: "-9deg", opacidad: 0.09, retraso: "-15s", duracion: "39s" },
  { top: "88%", tamano: 160, giro: "24deg", opacidad: 0.12, retraso: "-9s", duracion: "33s" },
  { top: "-6%", tamano: 140, giro: "-26deg", opacidad: 0.1, retraso: "-24s", duracion: "42s" },
];

/** Las cuatro capas de color, las marcas de agua y el velo del centro. */
export function FondoPlurum() {
  return (
    <>
      <div aria-hidden className="login-capa login-capa-verde" />
      <div aria-hidden className="login-capa login-capa-lima" />
      <div aria-hidden className="login-capa login-capa-ambar" />
      <div aria-hidden className="login-capa login-capa-cian" />

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

      <div aria-hidden className="login-velo" />
      <div aria-hidden className="login-respira" />
    </>
  );
}

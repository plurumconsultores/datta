/**
 * Motor de cambios de las herramientas editables (tableros cuyo contenido se
 * ajusta desde Datta, como la Herramienta de Gestión del Cambio NEXO - Gasco).
 *
 * El estado es un JSON. El tablero manda una lista de cambios:
 *   { op: "set",     ruta, antes, despues }   cambia un dato
 *   { op: "agregar", ruta, fila }              agrega una fila a una lista
 *   { op: "borrar",  ruta, id }                quita una fila de una lista
 *
 * La ruta es una lista de claves. Dentro de una lista, las filas se nombran con
 * "#<_id>" (no por posición), así dos personas pueden agregar o borrar filas a la
 * vez sin pisarse. Un "set" solo se aplica si el dato todavía vale lo que la
 * persona vio ("antes"); si otra persona ya lo cambió, se devuelve como conflicto.
 *
 * Sin dependencias: lo usa la ruta /api/herramienta/[slug] y se puede probar suelto.
 */

export type Token = string | number;
export type Cambio = {
  op: "set" | "agregar" | "borrar";
  ruta: Token[];
  antes?: unknown;
  despues?: unknown;
  fila?: Record<string, unknown>;
  id?: string;
  seccion?: string;
  campo?: string;
};
export type Registro = {
  op: Cambio["op"];
  ruta: Token[];
  antes: unknown;
  despues: unknown;
  seccion: string | null;
  campo: string | null;
};
export type Conflicto = { campo: string | null; seccion: string | null; motivo: string };

export const TOPE_CAMBIOS = 3000;
const PROHIBIDAS = new Set(["__proto__", "constructor", "prototype"]);
const ID_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;

const texto = (v: unknown, max = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export const igual = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function indice(lista: unknown[], t: Token): number {
  if (typeof t === "string" && t.startsWith("#")) {
    const id = t.slice(1);
    return lista.findIndex(
      (x) => !!x && typeof x === "object" && (x as Record<string, unknown>)._id === id,
    );
  }
  return typeof t === "number" && Number.isInteger(t) && t >= 0 && t < lista.length ? t : -1;
}

/** Nodo al que apunta la ruta (o undefined si no existe). */
export function leer(raiz: unknown, ruta: Token[]): unknown {
  let actual: unknown = raiz;
  for (const t of ruta) {
    if (actual == null || typeof actual !== "object") return undefined;
    if (Array.isArray(actual)) {
      const i = indice(actual, t);
      if (i < 0) return undefined;
      actual = actual[i];
    } else {
      if (typeof t !== "string" || PROHIBIDAS.has(t) || !Object.prototype.hasOwnProperty.call(actual, t)) return undefined;
      actual = (actual as Record<string, unknown>)[t];
    }
  }
  return actual;
}

function rutaValida(ruta: unknown): ruta is Token[] {
  return (
    Array.isArray(ruta) &&
    ruta.length > 0 &&
    ruta.length <= 10 &&
    ruta.every(
      (t) =>
        (typeof t === "string" && t.length <= 80 && !PROHIBIDAS.has(t.replace(/^#/, ""))) ||
        (typeof t === "number" && Number.isInteger(t) && t >= 0 && t < 1000),
    )
  );
}

/** Los valores que se pueden escribir con "set": texto, número, sí/no o vacío. */
function valorValido(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v === "string") return v.length <= 6000;
  if (typeof v === "number") return Number.isFinite(v);
  return typeof v === "boolean";
}

/** Una fila nueva: objeto plano, con _id válido, sin anidar más de dos niveles. */
function filaValida(f: unknown): f is Record<string, unknown> {
  if (!f || typeof f !== "object" || Array.isArray(f)) return false;
  const fila = f as Record<string, unknown>;
  if (typeof fila._id !== "string" || !ID_VALIDO.test(fila._id)) return false;
  const json = JSON.stringify(fila);
  if (json.length > 30000 || /"(__proto__|constructor|prototype)"\s*:/.test(json)) return false;
  return Object.values(fila).every(
    (v) => valorValido(v) || (Array.isArray(v) && v.length <= 50 && v.every((x) => valorValido(x) || (x && typeof x === "object"))),
  );
}

/**
 * Aplica los cambios sobre una copia del estado.
 * Devuelve el estado nuevo, lo que quedó aplicado (para el historial) y los conflictos.
 */
export function aplicarCambios(estado: Record<string, unknown>, cambios: unknown[]) {
  const datos = structuredClone(estado);
  const aplicados: Registro[] = [];
  const conflictos: Conflicto[] = [];

  for (const bruto of cambios.slice(0, TOPE_CAMBIOS)) {
    const c = (bruto ?? {}) as Cambio;
    const seccion = texto(c.seccion, 120), campo = texto(c.campo, 300);
    const rechazo = (motivo: string) => conflictos.push({ seccion, campo, motivo });

    if (!rutaValida(c.ruta)) { rechazo("Ruta inválida"); continue; }

    if (c.op === "set") {
      const padre = leer(datos, c.ruta.slice(0, -1));
      const ultima = c.ruta[c.ruta.length - 1];
      if (padre == null || typeof padre !== "object") { rechazo("El dato ya no existe"); continue; }
      if (!valorValido(c.despues ?? null)) { rechazo("Valor no permitido"); continue; }

      let i: number | string;
      if (Array.isArray(padre)) {
        i = indice(padre, ultima);
        if (i < 0) { rechazo("El dato ya no existe"); continue; }
        const actual = padre[i];
        if (actual !== null && typeof actual === "object") { rechazo("Valor no permitido"); continue; }
      } else {
        if (typeof ultima !== "string" || ultima.startsWith("#") || PROHIBIDAS.has(ultima)) { rechazo("Ruta inválida"); continue; }
        const actual = (padre as Record<string, unknown>)[ultima];
        if (actual !== undefined && actual !== null && typeof actual === "object") { rechazo("Valor no permitido"); continue; }
        // Solo se escriben campos que ya existen, salvo dentro de una fila (que sí tiene _id).
        if (!(ultima in padre) && typeof (padre as Record<string, unknown>)._id !== "string") { rechazo("Ruta inválida"); continue; }
        i = ultima;
      }

      const actual = (padre as Record<string | number, unknown>)[i];
      if (igual(actual, c.despues)) continue;                       // ya estaba así
      if (!igual(actual, c.antes)) { rechazo("Otra persona ya había cambiado este dato"); continue; }
      (padre as Record<string | number, unknown>)[i] = c.despues ?? null;
      aplicados.push({ op: "set", ruta: c.ruta, antes: actual ?? null, despues: c.despues ?? null, seccion, campo });
      continue;
    }

    const lista = leer(datos, c.ruta);
    if (!Array.isArray(lista)) { rechazo("La lista ya no existe"); continue; }

    if (c.op === "agregar") {
      if (!filaValida(c.fila)) { rechazo("Fila no permitida"); continue; }
      if (lista.length >= 2000) { rechazo("La lista llegó a su tope"); continue; }
      if (indice(lista, "#" + c.fila._id) >= 0) continue;           // ya estaba
      lista.push(c.fila);
      aplicados.push({ op: "agregar", ruta: [...c.ruta, "#" + c.fila._id], antes: null, despues: c.fila, seccion, campo });
      continue;
    }

    if (c.op === "borrar") {
      if (typeof c.id !== "string" || !ID_VALIDO.test(c.id)) { rechazo("Fila inválida"); continue; }
      const i = indice(lista, "#" + c.id);
      if (i < 0) { rechazo("Otra persona ya había eliminado esta fila"); continue; }
      const [quitada] = lista.splice(i, 1);
      aplicados.push({ op: "borrar", ruta: [...c.ruta, "#" + c.id], antes: quitada, despues: null, seccion, campo });
      continue;
    }

    rechazo("Operación desconocida");
  }

  return { datos, aplicados, conflictos };
}

/**
 * Segregación de datos: qué puede ver cada usuario dentro de un tablero.
 *
 * Las variables por las que se puede limitar las declara el propio tablero en
 * su HTML, con un bloque como este:
 *
 *   <script type="application/json" id="datta-variables">
 *     {"variables": [
 *       {"clave": "filial", "etiqueta": "Filial",
 *        "valores": ["TGI", "Enlaza", "Corporativa"]}
 *     ]}
 *   </script>
 *
 * scripts/cargar-tablero.ts lo lee al subir el tablero y lo guarda en
 * dashboards.variables, para que Administración no tenga que abrir el HTML.
 */

export type VariableTablero = {
  /** Nombre del campo en los datos del tablero: "filial", "genero"… */
  clave: string;
  /** Cómo se muestra en Administración. */
  etiqueta: string;
  /** Valores posibles, tal como aparecen en los datos. */
  valores: string[];
};

/** Un límite: dentro de ese tablero, de esa variable, solo estos valores. */
export type LimiteUsuario = {
  dashboard_slug: string;
  variable: string;
  valores: string[];
};

const ID_BLOQUE = "datta-variables";

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** Deja la lista de variables en forma canónica y descarta lo que no sirve. */
export function normalizarVariables(entrada: unknown): VariableTablero[] {
  const lista = Array.isArray(entrada)
    ? entrada
    : Array.isArray((entrada as { variables?: unknown })?.variables)
      ? (entrada as { variables: unknown[] }).variables
      : [];

  const salida: VariableTablero[] = [];

  for (const cruda of lista) {
    if (typeof cruda !== "object" || cruda === null) continue;
    const item = cruda as Record<string, unknown>;

    const clave = texto(item.clave) || texto(item.key) || texto(item.nombre);
    if (!clave) continue;

    const valores = Array.isArray(item.valores)
      ? item.valores.map(texto).filter(Boolean)
      : [];
    if (valores.length === 0) continue;

    salida.push({
      clave,
      etiqueta: texto(item.etiqueta) || texto(item.label) || clave,
      // Sin repetidos y en el orden en que los declaró el tablero.
      valores: [...new Set(valores)],
    });
  }

  return salida;
}

/**
 * Saca del HTML de un tablero el bloque de variables declaradas.
 * Si no lo trae, o viene mal armado, devuelve una lista vacía: el tablero
 * simplemente no se puede limitar.
 */
export function leerVariablesDeclaradas(html: string): VariableTablero[] {
  const patron = new RegExp(
    `<script[^>]*id=["']${ID_BLOQUE}["'][^>]*>([\\s\\S]*?)</script>`,
    "i",
  );
  const encontrado = html.match(patron);
  if (!encontrado) return [];

  try {
    return normalizarVariables(JSON.parse(encontrado[1].trim()));
  } catch {
    return [];
  }
}

/**
 * Agrupa los límites de un usuario en {variable: valores}. Si la misma
 * variable aparece en varios renglones, se queda con la intersección: manda
 * siempre el límite más estricto.
 */
export function mapaDeLimites(limites: LimiteUsuario[]): Record<string, string[]> {
  const mapa: Record<string, string[]> = {};

  for (const limite of limites) {
    const valores = (limite.valores ?? []).filter(Boolean);
    if (valores.length === 0) continue;

    const previos = mapa[limite.variable];
    mapa[limite.variable] = previos
      ? previos.filter((valor) => valores.includes(valor))
      : [...new Set(valores)];
  }

  return mapa;
}

/**
 * Encuestas de Datta: la definición que se arma en Administración y que la
 * página pública (/e/<slug>) dibuja.
 *
 * Las respuestas de cada encuesta viven en su propia tabla, creada al
 * publicarla por la función crear_tabla_respuestas() de Supabase.
 */

export type TipoPregunta = "unica" | "multiple" | "escala" | "texto";

export type Escala = {
  min: number;
  max: number;
  etiquetaMin: string;
  etiquetaMax: string;
};

export type Pregunta = {
  /**
   * Identificador estable: es la llave con la que se guarda la respuesta y el
   * nombre por el que un tablero conectado la busca. Se puede renombrar, pero
   * hacerlo con respuestas ya recogidas rompe la correspondencia.
   */
  id: string;
  texto: string;
  tipo: TipoPregunta;
  obligatoria: boolean;
  /** Para opción única y múltiple. */
  opciones: string[];
  /** Para opción múltiple: tope de casillas marcables. 0 = sin tope. */
  maxOpciones: number;
  /** Para escala. */
  escala: Escala;
  /** Para texto abierto: caja de varias líneas en vez de una sola. */
  textoLargo: boolean;
  /** Para texto abierto: tope de caracteres. 0 = el tope general. */
  maxCaracteres: number;
};

/** Nadie escribe un ensayo en una encuesta, y sin tope la base sufre. */
export const MAX_CARACTERES = 2000;

export type Bienvenida = {
  titulo: string;
  texto: string;
  boton: string;
};

export type Despedida = {
  titulo: string;
  texto: string;
};

/** Colores con los que se dibuja la encuesta pública. */
export type Tema = {
  /** Botones, acentos y la barra de avance. */
  principal: string;
  /** Fondo de la página. */
  fondo: string;
  /** Color del texto. */
  texto: string;
};

export type Encuesta = {
  id: string;
  slug: string;
  titulo: string;
  cliente_id: string | null;
  estado: "borrador" | "publicada" | "cerrada";
  bienvenida: Bienvenida;
  preguntas: Pregunta[];
  despedida: Despedida;
  tema: Tema;
  tabla_respuestas: string | null;
  /** Si el cliente ve su enlace y su QR dentro de Datta. */
  visible_cliente: boolean;
  /** Slug del tablero que se alimenta de esta encuesta, si hay alguno. */
  dashboard_slug: string | null;
};

/** Escalas de uso frecuente, para no armarlas a mano cada vez. */
export const ESCALAS_LISTAS: Record<string, Escala> = {
  likert: {
    min: 1,
    max: 5,
    etiquetaMin: "Totalmente en desacuerdo",
    etiquetaMax: "Totalmente de acuerdo",
  },
  /** La escala de Plurum es de 1 a 10. Siempre. */
  plurum: {
    min: 1,
    max: 10,
    etiquetaMin: "Nada",
    etiquetaMax: "Totalmente",
  },
  /** Atajo para las escalas que arrancan en cero; no es una escala de marca. */
  cerodiez: {
    min: 0,
    max: 10,
    etiquetaMin: "Nada",
    etiquetaMax: "Totalmente",
  },
  frecuencia: {
    min: 1,
    max: 5,
    etiquetaMin: "Nunca",
    etiquetaMax: "Siempre",
  },
};

export const ESCALA_POR_DEFECTO: Escala = ESCALAS_LISTAS.likert;

/** Botones que caben sin que la escala se vuelva ilegible. */
export const MAX_PUNTOS = 11;

export const TEMA_POR_DEFECTO: Tema = {
  principal: "#487629",
  fondo: "#F2F5EE",
  texto: "#1B2A17",
};

export const BIENVENIDA_POR_DEFECTO: Bienvenida = {
  titulo: "Gracias por participar",
  texto:
    "Esta encuesta es anónima y toma pocos minutos. No se guarda tu nombre ni tu correo: solo tus respuestas.",
  boton: "Comenzar",
};

export const DESPEDIDA_POR_DEFECTO: Despedida = {
  titulo: "¡Listo!",
  texto: "Tu respuesta quedó registrada. Gracias por tu tiempo.",
};

/** Texto libre → slug apto para la URL y para el nombre de la tabla. */
export function aSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function slugValido(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/.test(slug);
}

/** Nombre de la tabla de respuestas que le corresponde a un slug. */
export function tablaDe(slug: string): string {
  return `respuestas_${slug.replace(/-/g, "_")}`;
}

function texto(valor: unknown, porDefecto = ""): string {
  return typeof valor === "string" ? valor : porDefecto;
}

function entero(valor: unknown, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n) : porDefecto;
}

/** Deja una pregunta en forma canónica, venga de donde venga. */
export function normalizarPregunta(cruda: unknown, indice: number): Pregunta {
  const p = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<
    string,
    unknown
  >;

  const tipo: TipoPregunta =
    p.tipo === "multiple" || p.tipo === "escala" || p.tipo === "texto"
      ? p.tipo
      : "unica";

  const escalaCruda = (
    typeof p.escala === "object" && p.escala !== null ? p.escala : {}
  ) as Record<string, unknown>;

  const min = entero(escalaCruda.min, ESCALA_POR_DEFECTO.min);
  const max = entero(escalaCruda.max, ESCALA_POR_DEFECTO.max);

  return {
    id: texto(p.id) || `p${indice + 1}`,
    texto: texto(p.texto),
    tipo,
    obligatoria: p.obligatoria !== false,
    opciones: Array.isArray(p.opciones)
      ? p.opciones.map((o) => texto(o)).filter(Boolean)
      : [],
    maxOpciones: Math.max(0, entero(p.maxOpciones, 0)),
    escala: {
      min,
      /*
       * El tope es la CANTIDAD de puntos, no el valor: así 0 a 10 (once
       * puntos) es válido, igual que 1 a 5 o 1 a 10. Una escala al revés o de
       * un solo punto no se puede dibujar, y más de once botones no se leen.
       */
      max: max > min ? Math.min(max, min + MAX_PUNTOS - 1) : min + 4,
      etiquetaMin: texto(escalaCruda.etiquetaMin, ESCALA_POR_DEFECTO.etiquetaMin),
      etiquetaMax: texto(escalaCruda.etiquetaMax, ESCALA_POR_DEFECTO.etiquetaMax),
    },
    textoLargo: p.textoLargo !== false,
    maxCaracteres: Math.min(
      Math.max(0, entero(p.maxCaracteres, 0)) || MAX_CARACTERES,
      MAX_CARACTERES,
    ),
  };
}

export function normalizarPreguntas(crudas: unknown): Pregunta[] {
  return Array.isArray(crudas) ? crudas.map(normalizarPregunta) : [];
}

export function normalizarBienvenida(cruda: unknown): Bienvenida {
  const b = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<
    string,
    unknown
  >;
  return {
    titulo: texto(b.titulo, BIENVENIDA_POR_DEFECTO.titulo),
    texto: texto(b.texto, BIENVENIDA_POR_DEFECTO.texto),
    boton: texto(b.boton, BIENVENIDA_POR_DEFECTO.boton),
  };
}

export function normalizarDespedida(cruda: unknown): Despedida {
  const d = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<
    string,
    unknown
  >;
  return {
    titulo: texto(d.titulo, DESPEDIDA_POR_DEFECTO.titulo),
    texto: texto(d.texto, DESPEDIDA_POR_DEFECTO.texto),
  };
}

export function esHex(valor: unknown): valor is string {
  return typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor);
}

export function normalizarTema(cruda: unknown): Tema {
  const t = (typeof cruda === "object" && cruda !== null ? cruda : {}) as Record<
    string,
    unknown
  >;
  return {
    principal: esHex(t.principal) ? t.principal.toUpperCase() : TEMA_POR_DEFECTO.principal,
    fondo: esHex(t.fondo) ? t.fondo.toUpperCase() : TEMA_POR_DEFECTO.fondo,
    texto: esHex(t.texto) ? t.texto.toUpperCase() : TEMA_POR_DEFECTO.texto,
  };
}

/**
 * Blanco o negro, el que se lea mejor sobre ese color. Se usa para el texto de
 * los botones: con un amarillo de marca, letras blancas no se ven.
 */
export function contrasteSobre(hex: string): string {
  const color = esHex(hex) ? hex : "#000000";
  const canal = (i: number) => {
    const v = parseInt(color.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
  return luminancia > 0.42 ? "#111111" : "#FFFFFF";
}

/** Texto libre → identificador de pregunta (minúsculas, sin tildes). */
export function aIdentificador(texto: string): string {
  const limpio = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return limpio || "pregunta";
}

/**
 * Las variables que un tablero declara en su HTML, tal como las guarda
 * dashboards.variables. Se reusa el mismo formato de la segregación de datos.
 */
export function normalizarVariablesTablero(
  cruda: unknown,
): { clave: string; etiqueta: string; valores: string[] }[] {
  const lista = Array.isArray(cruda) ? cruda : [];
  const salida: { clave: string; etiqueta: string; valores: string[] }[] = [];

  for (const item of lista) {
    if (typeof item !== "object" || item === null) continue;
    const v = item as Record<string, unknown>;
    const clave = typeof v.clave === "string" ? v.clave.trim() : "";
    if (!clave) continue;
    salida.push({
      clave,
      etiqueta: typeof v.etiqueta === "string" && v.etiqueta ? v.etiqueta : clave,
      valores: Array.isArray(v.valores)
        ? v.valores.filter((x): x is string => typeof x === "string")
        : [],
    });
  }

  return salida;
}

export type AvisoCompatibilidad = {
  nivel: "error" | "aviso";
  texto: string;
};

/**
 * Compara lo que el tablero declara necesitar (su bloque datta-variables) con
 * lo que la encuesta ofrece. No bloquea nada: informa, que es lo que evita
 * conectar un tablero que después muestra vacío sin decir por qué.
 */
export function analizarCompatibilidad(
  preguntas: Pregunta[],
  variablesTablero: { clave: string; etiqueta: string; valores: string[] }[],
): AvisoCompatibilidad[] {
  const avisos: AvisoCompatibilidad[] = [];

  if (variablesTablero.length === 0) {
    avisos.push({
      nivel: "aviso",
      texto:
        "Este tablero no declara variables, así que no se puede comprobar si encaja con la encuesta. Se conecta igual, pero revisa que el tablero sepa leer estos datos.",
    });
    return avisos;
  }

  const porId = new Map(preguntas.map((p) => [p.id, p]));

  for (const variable of variablesTablero) {
    const pregunta = porId.get(variable.clave);

    if (!pregunta) {
      avisos.push({
        nivel: "error",
        texto: `El tablero espera la variable "${variable.clave}" (${variable.etiqueta}) y ninguna pregunta tiene ese identificador.`,
      });
      continue;
    }

    if (pregunta.tipo === "texto") {
      avisos.push({
        nivel: "error",
        texto: `El tablero espera la variable "${variable.clave}" y en la encuesta es una pregunta de texto abierto: no tiene valores fijos que el tablero pueda agrupar.`,
      });
      continue;
    }

    if (pregunta.tipo === "escala") {
      const puntos = puntosDeEscala(pregunta.escala).map(String);
      const fuera = variable.valores.filter((v) => !puntos.includes(v));
      if (fuera.length > 0) {
        avisos.push({
          nivel: "aviso",
          texto: `"${variable.etiqueta}" es una escala de ${pregunta.escala.min} a ${pregunta.escala.max} y el tablero espera valores como ${fuera.slice(0, 3).join(", ")}.`,
        });
      }
      continue;
    }

    const sinCubrir = variable.valores.filter((v) => !pregunta.opciones.includes(v));
    if (sinCubrir.length > 0) {
      avisos.push({
        nivel: "aviso",
        texto: `El tablero espera de "${variable.etiqueta}" valores que la encuesta no ofrece: ${sinCubrir.slice(0, 4).join(", ")}${sinCubrir.length > 4 ? "…" : ""}.`,
      });
    }

    const sinUsar = pregunta.opciones.filter((o) => !variable.valores.includes(o));
    if (sinUsar.length > 0) {
      avisos.push({
        nivel: "aviso",
        texto: `La encuesta ofrece en "${pregunta.texto || pregunta.id}" opciones que el tablero no contempla: ${sinUsar.slice(0, 4).join(", ")}${sinUsar.length > 4 ? "…" : ""}.`,
      });
    }
  }

  return avisos;
}

export const ETIQUETA_TIPO: Record<TipoPregunta, string> = {
  unica: "Opción única",
  multiple: "Opción múltiple",
  escala: "Escala",
  texto: "Texto abierto",
};

/** Los números de una escala, para dibujar los botones. */
export function puntosDeEscala(escala: Escala): number[] {
  const puntos: number[] = [];
  for (let n = escala.min; n <= escala.max; n += 1) puntos.push(n);
  return puntos;
}

/**
 * Comprueba una respuesta contra su pregunta. Se usa en el servidor al
 * recibirla: lo que llega del navegador no es de fiar.
 */
export function respuestaValida(pregunta: Pregunta, valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === "") {
    return !pregunta.obligatoria;
  }

  if (pregunta.tipo === "texto") {
    if (typeof valor !== "string") return false;
    const limpio = valor.trim();
    if (limpio.length === 0) return !pregunta.obligatoria;
    return limpio.length <= (pregunta.maxCaracteres || MAX_CARACTERES);
  }

  if (pregunta.tipo === "unica") {
    return typeof valor === "string" && pregunta.opciones.includes(valor);
  }

  if (pregunta.tipo === "multiple") {
    if (!Array.isArray(valor)) return false;
    if (valor.some((v) => typeof v !== "string" || !pregunta.opciones.includes(v))) {
      return false;
    }
    if (pregunta.obligatoria && valor.length === 0) return false;
    if (pregunta.maxOpciones > 0 && valor.length > pregunta.maxOpciones) return false;
    return true;
  }

  const n = Number(valor);
  return (
    Number.isInteger(n) && n >= pregunta.escala.min && n <= pregunta.escala.max
  );
}

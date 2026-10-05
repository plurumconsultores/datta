import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import poblacionExco from "@/lib/poblaciones/seguimiento-exco-banconal.json";

/**
 * Seguimiento EN VIVO de encuestas montadas en Typeform.
 *
 * El navegador no puede consultar la API de Typeform directamente (no permite
 * CORS y además expondría el token), así que esta ruta lo hace desde el
 * servidor con el token guardado en la variable de entorno TYPEFORM_TOKEN.
 *
 * La consume el tablero nativo servido en /d/<slug>/raw (mismo origen), así
 * que las cookies de sesión viajan solas.
 *
 *   GET /api/typeform/<slug-del-tablero>
 *     -> { actualizado, desde, total, duplicadas, campos, filas }
 *        filas = [[fechaISO, valor campo 1, valor campo 2, ...], ...]
 *
 * Solo salen las respuestas COMPLETAS y solo las preguntas declaradas en
 * `campos` (los datos de segmentación). Nunca salen campos ocultos (correo,
 * número de colaborador, nombre) ni las respuestas de la encuesta.
 *
 * Cruce con la base: si la encuesta se respondió con el link personalizado,
 * las preguntas demográficas se saltan y vienen vacías. En ese caso se toma
 * el correo o el número de colaborador de los campos ocultos, se busca (como
 * hash) en el mapa de población que genera `generar_dashboard.py` y se
 * devuelve la subgerencia / gerencia / región / lugar de la BASE. El correo
 * nunca sale del servidor.
 */

/** Mapa de población: hash(correo|número) -> índices en `tablas`. */
type Poblacion = { tablas: Record<"s" | "g" | "r" | "l", string[]>; p: Record<string, number[]> };

type Campo = { nombre: string; ref: string; prefijo?: boolean };
type Config = { formId: string; desde: string; campos: Campo[]; poblacion?: Poblacion; sal?: string };

/** Un tablero por encuesta. La llave es el slug del tablero en Datta. */
const TABLEROS: Record<string, Config> = {
  "seguimiento-exco-banconal": {
    formId: "E1dxCvo9",
    // Salida en vivo: 5-oct-2026, 00:00 hora de Panamá (UTC-5).
    desde: "2026-10-05T05:00:00Z",
    campos: [
      { nombre: "subgerencia", ref: "subgerencia" },
      { nombre: "gerencia", ref: "ge_", prefijo: true },
      { nombre: "region", ref: "region" },
      { nombre: "lugar", ref: "lugar_", prefijo: true },
    ],
    poblacion: poblacionExco as Poblacion,
    // Debe ser igual a SAL en generar_dashboard.py
    sal: "plurum-exco-banconal-2026",
  },
};

/** Caché en memoria para no golpear a Typeform en cada recarga. */
const CACHE_MS = 60_000;
const cache = new Map<string, { t: number; cuerpo: unknown }>();

type Respuesta = {
  token: string;
  submitted_at?: string;
  hidden?: Record<string, string>;
  answers?: {
    field: { ref: string };
    type: string;
    choice?: { label?: string; other?: string };
    text?: string;
  }[];
};

function valorDe(r: Respuesta, campo: Campo): string {
  const a = (r.answers ?? []).find((x) =>
    campo.prefijo ? x.field.ref.startsWith(campo.ref) : x.field.ref === campo.ref,
  );
  if (!a) return "";
  return a.choice?.label ?? a.choice?.other ?? a.text ?? "";
}

/**
 * Si el link personalizado trae un identificador oculto, se usa SOLO para no
 * contar dos veces a la misma persona. No sale de esta función.
 */
function idOculto(r: Respuesta): string | null {
  const h = r.hidden ?? {};
  for (const k of Object.keys(h)) {
    if (/colab|codigo|numero|^id$|correo|email|mail/i.test(k) && h[k]) {
      return `${k}:${String(h[k]).trim().toLowerCase()}`;
    }
  }
  return null;
}

/** Busca a la persona en la base por los campos ocultos del link personalizado. */
function segmentoDeBase(r: Respuesta, cfg: Config): string[] | null {
  const pob = cfg.poblacion;
  if (!pob || !cfg.sal) return null;
  const hsh = (k: string) => createHash("sha256").update(`${cfg.sal}:${k}`).digest("hex").slice(0, 16);
  for (const valor of Object.values(r.hidden ?? {})) {
    const v = String(valor ?? "").trim().toLowerCase();
    if (!v) continue;
    const llaves: string[] = [];
    if (v.includes("@")) llaves.push(`c:${v}`);
    const digitos = v.replace(/\D/g, "");
    if (digitos && digitos.length >= 3 && !v.includes("@")) llaves.push(`n:${String(Number(digitos))}`);
    for (const k of llaves) {
      const seg = pob.p[hsh(k)];
      if (seg) {
        return [pob.tablas.s[seg[0]], pob.tablas.g[seg[1]], pob.tablas.r[seg[2]], pob.tablas.l[seg[3]]];
      }
    }
  }
  return null;
}

async function traerRespuestas(cfg: Config, token: string) {
  const PAGINA = 1000;
  const todas: Respuesta[] = [];
  let antes: string | null = null;
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    const url = new URL(`https://api.typeform.com/forms/${cfg.formId}/responses`);
    url.searchParams.set("page_size", String(PAGINA));
    url.searchParams.set("response_type", "completed");
    url.searchParams.set("since", cfg.desde);
    if (antes) url.searchParams.set("before", antes);

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const detalle = await r.text().catch(() => "");
      throw new Error(`Typeform respondió ${r.status}: ${detalle.slice(0, 200)}`);
    }
    const datos = (await r.json()) as { items?: Respuesta[] };
    const items = datos.items ?? [];
    todas.push(...items);
    if (items.length < PAGINA) break;
    antes = items[items.length - 1].token;
  }
  return todas;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cfg = TABLEROS[slug];
  if (!cfg) return NextResponse.json({ error: "Tablero sin encuesta Typeform" }, { status: 404 });

  // Sesión + permiso: si RLS no le deja ver el tablero, tampoco sus datos.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: tablero } = await supabase
    .from("dashboards")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!tablero) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const enCache = cache.get(slug);
  if (enCache && Date.now() - enCache.t < CACHE_MS) {
    return NextResponse.json(enCache.cuerpo, { headers: { "Cache-Control": "no-store" } });
  }

  const token = process.env.TYPEFORM_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Falta la variable de entorno TYPEFORM_TOKEN en el servidor" },
      { status: 500 },
    );
  }

  try {
    const respuestas = await traerRespuestas(cfg, token);

    // Más reciente primero (así viene de Typeform): si alguien respondió dos
    // veces con el mismo link, se queda su última respuesta.
    const vistos = new Set<string>();
    let duplicadas = 0;
    let cruzadas = 0;
    let porEncuesta = 0;
    let sinDatos = 0;
    const ocultos = new Set<string>();
    const filas: string[][] = [];
    for (const r of respuestas) {
      if (!r.submitted_at) continue;
      const id = idOculto(r);
      if (id) {
        if (vistos.has(id)) {
          duplicadas++;
          continue;
        }
        vistos.add(id);
      }
      const deBase = segmentoDeBase(r, cfg);
      const declarados = cfg.campos.map((c) => valorDe(r, c));
      if (deBase) cruzadas++;
      else if (declarados.some(Boolean)) porEncuesta++;
      else sinDatos++;
      if (r.hidden) Object.keys(r.hidden).forEach((k) => ocultos.add(k));
      filas.push([r.submitted_at, ...(deBase ?? declarados)]);
    }

    const cuerpo = {
      actualizado: new Date().toISOString(),
      desde: cfg.desde,
      total: filas.length,
      duplicadas,
      // Diagnóstico del cruce: solo conteos y NOMBRES de los campos ocultos.
      cruce: { conBase: cruzadas, porEncuesta, sinDatos, camposOcultos: [...ocultos] },
      campos: ["fecha", ...cfg.campos.map((c) => c.nombre)],
      filas,
    };
    cache.set(slug, { t: Date.now(), cuerpo });
    return NextResponse.json(cuerpo, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error consultando Typeform";
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}

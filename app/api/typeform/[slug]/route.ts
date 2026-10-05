import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
 */

type Campo = { nombre: string; ref: string; prefijo?: boolean };
type Config = { formId: string; desde: string; campos: Campo[] };

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
      filas.push([r.submitted_at, ...cfg.campos.map((c) => valorDe(r, c))]);
    }

    const cuerpo = {
      actualizado: new Date().toISOString(),
      desde: cfg.desde,
      total: filas.length,
      duplicadas,
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

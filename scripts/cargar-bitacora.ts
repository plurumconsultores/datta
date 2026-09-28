/**
 * Siembra/actualiza los proyectos del tablero "Bitácora" en la tabla
 * public.bitacora_proyectos (Supabase de Datta).
 *
 * Prerrequisito: la tabla ya existe (ejecuta antes scripts/bitacora_proyectos.sql
 * en el SQL Editor del panel de Supabase).
 *
 * Uso:
 *   npm run cargar-bitacora -- ../bitacora/index.html
 *   # o directamente:
 *   npx tsx scripts/cargar-bitacora.ts ../bitacora/index.html
 *   # sin argumento usa ../bitacora/index.html por defecto.
 *
 * - Lee el array `const DATA = {…}` embebido en el index.html.
 * - Omite los campos DERIVADOS (categoria, por_facturar, pct_por_facturar, cc_code):
 *   los calcula la BD con columnas generadas.
 * - Conserva avance_actual (es dato). Auditoría en null (heredados).
 * - Idempotente: upsert por `seed_ref` (hash estable de los campos del proyecto).
 * - Guardia anti-texto-corrupto: aborta si detecta mojibake (faltó la corrección
 *   de codificación / PROMPT_14).
 */
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type Proyecto = {
  anio: number | null;
  cliente: string;
  nombre_corto: string | null;
  linea_negocio: string | null;
  sublinea: string | null;
  centro_costos: string | null;
  fecha_inicio: string | null;
  fecha_cierre: string | null;
  tiempo_ejecucion: string | null;
  estado: string;
  avance_actual: number | null;
  responsable: string | null;
  valor_proyecto: number | null;
  valor_facturado: number | null;
  observacion: string | null;
};

const MOJIBAKE = /�|Ã|Â|â€/;

function seedRef(p: Proyecto): string {
  const base = [
    p.cliente,
    p.nombre_corto,
    p.linea_negocio,
    p.sublinea,
    p.centro_costos,
    p.fecha_inicio,
    p.fecha_cierre,
    p.estado,
    p.valor_proyecto,
    p.valor_facturado,
  ].join("|");
  return "bitacora:" + createHash("sha1").update(base, "utf8").digest("hex");
}

async function main() {
  try {
    loadEnvFile(".env.local");
  } catch {
    // .env.local ausente: se usan las variables del entorno si están presentes.
  }

  const filePath = process.argv[2] ?? "../bitacora/index.html";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY en .env.local",
    );
    process.exit(1);
  }

  const html = await readFile(filePath, "utf-8");

  // Extrae el objeto DATA embebido (const DATA = {…};).
  const m = html.match(/const DATA = (\{[\s\S]*?\});\s*<\/script>/);
  if (!m) {
    console.error("No se encontró `const DATA = {…}` en " + filePath);
    process.exit(1);
  }
  const data = JSON.parse(m[1]) as { proyectos: Proyecto[] };
  const proyectos = data.proyectos ?? [];
  console.log(`Proyectos encontrados: ${proyectos.length}`);

  // 🛡️ Guardia anti-texto-corrupto: aborta sin escribir si hay mojibake.
  const corruptos: string[] = [];
  for (const p of proyectos) {
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === "string" && MOJIBAKE.test(v)) {
        corruptos.push(`${p.nombre_corto ?? p.cliente} .${k}: ${v}`);
      }
    }
  }
  if (corruptos.length) {
    console.error(
      `ABORTADO: ${corruptos.length} strings con texto corrupto (mojibake). ` +
        "Corrige la codificación del index.html antes de sembrar.",
    );
    corruptos.slice(0, 10).forEach((c) => console.error("  - " + c));
    process.exit(1);
  }

  // Mapea a filas. Omite derivados (categoria, por_facturar, pct_por_facturar, cc_code).
  const filas = proyectos.map((p) => ({
    seed_ref: seedRef(p),
    anio: p.anio ?? null,
    cliente: p.cliente,
    nombre_corto: p.nombre_corto ?? null,
    linea_negocio: p.linea_negocio ?? null,
    sublinea: p.sublinea ?? null,
    centro_costos: p.centro_costos ?? null,
    fecha_inicio: p.fecha_inicio ?? null,
    fecha_cierre: p.fecha_cierre ?? null,
    tiempo_ejecucion: p.tiempo_ejecucion ?? null,
    estado: p.estado,
    avance_actual: p.avance_actual ?? null,
    responsable: p.responsable ?? null,
    valor_proyecto: Math.round(p.valor_proyecto ?? 0),
    valor_facturado: Math.round(p.valor_facturado ?? 0),
    observacion: p.observacion ?? null,
    // auditoría en null para los heredados
    creado_por: null,
    creado_en: null,
    cerrado_por: null,
    cerrado_en: null,
    eliminado_por: null,
    eliminado_en: null,
  }));

  // Verifica unicidad de la clave (no debería haber colisiones).
  const refs = new Set(filas.map((f) => f.seed_ref));
  if (refs.size !== filas.length) {
    console.error(
      `ABORTADO: claves seed_ref duplicadas (${filas.length - refs.size}). ` +
        "Revisa proyectos idénticos en el snapshot.",
    );
    process.exit(1);
  }

  // Cliente con service role (SOLO scripts/servidor). Bypassa RLS.
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error, count } = await supabase
    .from("bitacora_proyectos")
    .upsert(filas, { onConflict: "seed_ref", count: "exact" });

  if (error) {
    console.error("Error al sembrar:", error.message);
    process.exit(1);
  }
  console.log(`Upsert OK (${count ?? filas.length} filas).`);

  // Resumen por estado desde la BD.
  const { data: todos, error: e2 } = await supabase
    .from("bitacora_proyectos")
    .select("estado, eliminado_por");
  if (e2) {
    console.error("Sembrado, pero falló el conteo:", e2.message);
    process.exit(1);
  }
  const total = todos!.length;
  const cerrados = todos!.filter(
    (r) => r.estado === "Cerrado" && !r.eliminado_por,
  ).length;
  const eliminados = todos!.filter((r) => r.eliminado_por).length;
  const activos = todos!.filter((r) => r.estado !== "Cerrado").length;
  console.log(
    `Total: ${total} · Activos (estado≠Cerrado): ${activos} · ` +
      `Cerrados: ${cerrados} · Eliminados: ${eliminados}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

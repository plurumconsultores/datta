/**
 * Carga un tablero nativo desde un archivo HTML autocontenido, sin copiar/pegar.
 *
 * Uso:
 *   npm run cargar-tablero -- mi-slug "Mi título" ./ruta/al/tablero.html
 *   # o directamente:
 *   npx tsx scripts/cargar-tablero.ts mi-slug "Mi título" ./ruta/al/tablero.html
 *
 * - Si ya existe un dashboard con ese slug: actualiza solo title y content
 *   (no toca is_active ni sort_order).
 * - Si no existe: inserta uno nuevo (type='native', is_active=true, sort_order=0).
 */
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function main() {
  // Carga .env.local (no se hace automáticamente fuera de Next.js).
  try {
    loadEnvFile(".env.local");
  } catch {
    // .env.local no existe: se usarán las variables del entorno si están presentes.
  }

  const [slug, title, filePath] = process.argv.slice(2);

  if (!slug || !title || !filePath) {
    console.error(
      "Uso: npx tsx scripts/cargar-tablero.ts <slug> <title> <archivo.html>",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY en .env.local",
    );
    process.exit(1);
  }

  const content = await readFile(filePath, "utf-8");

  // Cliente con la llave secreta: SOLO servidor / scripts. Nunca en el navegador.
  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ¿Ya existe un tablero con ese slug?
  const { data: existing, error: lookupError } = await supabase
    .from("dashboards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    console.error("Error al consultar el tablero:", lookupError.message);
    process.exit(1);
  }

  if (existing) {
    // Actualiza solo title y content; conserva is_active y sort_order.
    const { data, error } = await supabase
      .from("dashboards")
      .update({ title, content })
      .eq("slug", slug)
      .select("id, slug")
      .single();

    if (error) {
      console.error("Error al actualizar el tablero:", error.message);
      process.exit(1);
    }

    console.log(`Tablero actualizado: ${data.slug} (id: ${data.id})`);
  } else {
    const { data, error } = await supabase
      .from("dashboards")
      .insert({
        slug,
        title,
        type: "native",
        is_active: true,
        sort_order: 0,
        content,
      })
      .select("id, slug")
      .single();

    if (error) {
      console.error("Error al crear el tablero:", error.message);
      process.exit(1);
    }

    console.log(`Tablero creado: ${data.slug} (id: ${data.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

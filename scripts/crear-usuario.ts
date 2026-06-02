/**
 * Crea un usuario en Supabase usando la API de administración.
 * Es la ÚNICA forma de dar de alta usuarios (el signup público está desactivado).
 *
 * Uso:
 *   npm run crear-usuario -- usuario@dominio.com "miContraseña"
 *   # o directamente:
 *   npx tsx scripts/crear-usuario.ts usuario@dominio.com "miContraseña"
 */
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

async function main() {
  // Carga .env.local (no se hace automáticamente fuera de Next.js).
  try {
    loadEnvFile(".env.local");
  } catch {
    // .env.local no existe: se usarán las variables del entorno si están presentes.
  }

  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      "Uso: npx tsx scripts/crear-usuario.ts <email> <contraseña>",
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

  // Cliente con la llave secreta: SOLO servidor / scripts. Nunca en el navegador.
  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("Error al crear el usuario:", error.message);
    process.exit(1);
  }

  console.log(`Usuario creado: ${data.user?.email} (id: ${data.user?.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

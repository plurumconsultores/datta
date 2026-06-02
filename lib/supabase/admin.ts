import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente "admin" de Supabase con la llave SECRETA. Bypasea RLS y da acceso a
 * la API de administración (auth.admin.*).
 *
 * SOLO servidor: el import 'server-only' hace fallar el build si se importa
 * desde un componente de cliente. Úsalo únicamente dentro de Server Actions /
 * Route Handlers y SIEMPRE después de requireAdmin().
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

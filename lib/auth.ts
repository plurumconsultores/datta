import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Protege páginas y Server Actions bajo /admin.
 * - Sin sesión -> redirige a /login.
 * - Con sesión pero no admin -> redirige a /.
 * Devuelve el cliente de servidor y el usuario para reutilizarlos.
 *
 * La autorización real la imponen las políticas RLS de Supabase; esto solo
 * controla la navegación con la sesión del usuario (sin llave secreta).
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/");
  }

  return { supabase, user };
}

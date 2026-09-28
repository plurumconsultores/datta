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


/**
 * Protege lo que puede usar el equipo de Plurum: rol admin o analista. Es la
 * misma condición que la función puede_ver_todo() de Supabase, de la que
 * cuelgan las políticas de RLS de las encuestas.
 * - Sin sesión -> /login.
 * - Con sesión pero sin rol -> /.
 */
export async function requireEquipo() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: equipo }, { data: admin }] = await Promise.all([
    supabase.rpc("puede_ver_todo"),
    supabase.rpc("is_admin"),
  ]);

  if (!equipo) {
    redirect("/");
  }

  return { supabase, user, isAdmin: admin === true };
}

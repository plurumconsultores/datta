import { createClient } from "@/lib/supabase/server";

/**
 * Sirve el HTML de un tablero nativo por una ruta protegida.
 * - Sin sesión -> 401.
 * - Sin permiso (RLS no devuelve fila) o inexistente / no nativo -> 404.
 * Reutiliza la sesión del usuario; RLS impone los permisos.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("content")
    .eq("slug", slug)
    .eq("type", "native")
    .single<{ content: string | null }>();

  if (!dashboard) {
    return new Response("No encontrado", { status: 404 });
  }

  return new Response(dashboard.content ?? "", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

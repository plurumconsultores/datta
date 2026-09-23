import { createClient } from "@/lib/supabase/server";
import { mapaDeLimites, type LimiteUsuario } from "@/lib/segregacion";

/**
 * Mete al principio del HTML un bloque con el contexto del usuario, para que
 * el tablero pueda leerlo sin parsear la URL:
 *
 *   window.DATTA = { usuario: "...", limites: { filial: ["TGI"] } }
 *
 * Un tablero que no sepa de esto simplemente lo ignora.
 */
function inyectarContexto(html: string, datos: unknown): string {
  const json = JSON.stringify(datos).replace(/</g, "\\u003c");
  const bloque = `<script>window.DATTA=Object.freeze(${json});</script>`;

  const cabeza = html.match(/<head[^>]*>/i);
  if (cabeza) return html.replace(cabeza[0], `${cabeza[0]}${bloque}`);

  const raiz = html.match(/<html[^>]*>/i);
  if (raiz) return html.replace(raiz[0], `${raiz[0]}${bloque}`);

  return bloque + html;
}

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

  // Límites de datos del usuario para ESTE tablero. RLS deja que cada quien
  // lea los suyos; si las tablas no existen todavía, no hay límites.
  let limites: Record<string, string[]> = {};
  const { data: segregacion } = await supabase
    .from("usuario_segregacion")
    .select("requiere")
    .eq("user_id", user.id)
    .maybeSingle<{ requiere: boolean }>();

  if (segregacion?.requiere) {
    const { data } = await supabase
      .from("usuario_limites")
      .select("dashboard_slug, variable, valores")
      .eq("user_id", user.id)
      .eq("dashboard_slug", slug);
    limites = mapaDeLimites((data ?? []) as LimiteUsuario[]);
  }

  const html = inyectarContexto(dashboard.content ?? "", {
    usuario: user.email ?? null,
    limites,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

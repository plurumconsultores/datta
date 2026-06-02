import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas.
 *
 * IMPORTANTE: se verifica al usuario con `supabase.auth.getUser()`, que
 * contacta al servidor de Supabase y valida el token. NO confiar solo en
 * `getSession()`, que lee la cookie sin validarla.
 */
export async function proxy(request: NextRequest) {
  // Respuesta base; se irá reemplazando si Supabase necesita refrescar cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No metas lógica entre createServerClient y getUser: refresca la sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas públicas que no requieren sesión.
  const isPublic = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    // Conserva las cookies de sesión refrescadas en la redirección.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico y archivos de imagen comunes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierra la sesión y redirige a /login.
 * Se invoca desde un <form method="post" action="/logout">.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 para convertir el POST del formulario en un GET hacia /login.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarCambios, TOPE_CAMBIOS } from "@/lib/herramienta";

/**
 * Estado vivo e historial de una herramienta editable (tablero nativo que se
 * ajusta desde Datta). El tablero vive en el mismo origen, así que la cookie de
 * sesión viaja sola desde el iframe.
 *
 *   GET                 -> { datos, version, historial, puedeEditar, usuario }
 *   GET ?solo=version   -> { version }
 *   POST { version, nota, cambios, semilla? } -> lo mismo que GET + { aplicados, conflictos }
 *
 * Permiso: quien puede ver el tablero (RLS de `dashboards`) puede verlo y editarlo;
 * cada cambio queda en `herramienta_historial` con su correo. Las tablas no tienen
 * políticas abiertas: después de comprobar el acceso, lee y escribe el servidor
 * con la llave secreta. Ver scripts/herramienta_editable.sql.
 */

export const dynamic = "force-dynamic";

const TOPE_HISTORIAL = 1500;
const TOPE_CUERPO = 4_000_000; // bytes

type Fila = { datos: Record<string, unknown>; version: number } | null;

async function acceso(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sin sesión" }, { status: 401 }) };

  // RLS decide: si el usuario no tiene el tablero, no hay fila.
  const { data: tablero } = await supabase
    .from("dashboards")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle<{ slug: string }>();
  if (!tablero) return { error: NextResponse.json({ error: "No encontrado" }, { status: 404 }) };

  return { user, admin: createAdminClient() };
}

async function leerEstado(admin: ReturnType<typeof createAdminClient>, slug: string): Promise<Fila> {
  const { data, error } = await admin
    .from("herramienta_estado")
    .select("datos, version")
    .eq("slug", slug)
    .maybeSingle<{ datos: Record<string, unknown>; version: number }>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function paquete(admin: ReturnType<typeof createAdminClient>, slug: string, usuario: string | null) {
  const fila = await leerEstado(admin, slug);
  const { data: historial, error } = await admin
    .from("herramienta_historial")
    .select("id, lote, version, fecha, usuario, nota, op, ruta, seccion, campo, antes, despues")
    .eq("slug", slug)
    .order("id", { ascending: false })
    .limit(TOPE_HISTORIAL);
  if (error) throw new Error(error.message);
  return {
    datos: fila?.datos ?? null,
    version: fila?.version ?? 0,
    historial: historial ?? [],
    puedeEditar: true,
    usuario,
  };
}

const fallo = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  const aviso = /herramienta_(estado|historial|guardar)/.test(msg)
    ? "Faltan las tablas de herramientas editables: correr scripts/herramienta_editable.sql en Supabase."
    : msg;
  return NextResponse.json({ error: aviso }, { status: 500 });
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await acceso(slug);
  if ("error" in a) return a.error;

  try {
    if (new URL(request.url).searchParams.get("solo") === "version") {
      const fila = await leerEstado(a.admin, slug);
      return NextResponse.json({ version: fila?.version ?? 0 }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(await paquete(a.admin, slug, a.user.email ?? null), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fallo(e);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await acceso(slug);
  if ("error" in a) return a.error;

  const crudo = await request.text();
  if (crudo.length > TOPE_CUERPO) return NextResponse.json({ error: "Demasiados cambios en un solo guardado" }, { status: 413 });

  let cuerpo: { nota?: unknown; cambios?: unknown; semilla?: unknown };
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const cambios = Array.isArray(cuerpo.cambios) ? cuerpo.cambios : [];
  if (!cambios.length) return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
  if (cambios.length > TOPE_CAMBIOS) return NextResponse.json({ error: `Máximo ${TOPE_CAMBIOS} cambios por guardado` }, { status: 413 });
  const nota = typeof cuerpo.nota === "string" && cuerpo.nota.trim() ? cuerpo.nota.trim().slice(0, 500) : null;
  const usuario = a.user.email ?? null;

  try {
    // Hasta 5 intentos: si otra persona guardó justo en medio, se vuelve a leer
    // el estado y se aplican los cambios encima (cada dato se revisa por separado).
    for (let intento = 0; intento < 5; intento++) {
      const fila = await leerEstado(a.admin, slug);
      let base = fila?.datos;
      const s = cuerpo.semilla;
      const semilla =
        s && typeof s === "object" && !Array.isArray(s) && typeof (s as Record<string, unknown>).esquema === "number"
          ? (s as Record<string, unknown>)
          : null;
      const esqGuardado = typeof base?.esquema === "number" ? (base.esquema as number) : 0;
      // Una página más vieja que lo guardado no puede escribir encima.
      if (base && semilla && (semilla.esquema as number) < esqGuardado) {
        return NextResponse.json({ error: "La herramienta se actualizó; recargue la página" }, { status: 409 });
      }
      // Primer guardado, o el HTML trae una estructura nueva (p. ej. otra versión del Excel):
      // el estado arranca de lo que trae el tablero. Lo anterior queda en el historial.
      if (!base || (semilla && (semilla.esquema as number) > esqGuardado)) {
        if (!semilla) return NextResponse.json({ error: "Falta el estado inicial del tablero" }, { status: 409 });
        base = semilla;
      }

      const { datos, aplicados, conflictos } = aplicarCambios(base, cambios);
      if (!aplicados.length) {
        return NextResponse.json({ ...(await paquete(a.admin, slug, usuario)), aplicados: 0, conflictos });
      }

      const { data: nueva, error } = await a.admin.rpc("herramienta_guardar", {
        p_slug: slug,
        p_version: fila?.version ?? 0,
        p_datos: datos,
        p_usuario: usuario,
        p_usuario_id: a.user.id,
        p_nota: nota,
        p_cambios: aplicados,
      });
      if (error) throw new Error(error.message);
      if (nueva == null) continue; // alguien guardó en medio: reintentar

      return NextResponse.json({ ...(await paquete(a.admin, slug, usuario)), aplicados: aplicados.length, conflictos });
    }
    return NextResponse.json({ error: "Hay muchas personas guardando a la vez; intente de nuevo." }, { status: 409 });
  } catch (e) {
    return fallo(e);
  }
}

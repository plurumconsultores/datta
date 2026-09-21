"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_LOGOS, esHexValido, limitarOpacidad } from "@/lib/clientes";

const PATH = "/admin/clientes";

/** Los logos son marcas, no fotos: 1 MB sobra y evita subidas accidentales. */
const MAX_LOGO_BYTES = 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function revalidate() {
  revalidatePath(PATH);
  revalidatePath("/admin");
  revalidatePath("/");
}

function fallar(mensaje: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(mensaje)}`);
}

/**
 * Sube el logo al bucket público con la llave secreta (el usuario nunca
 * escribe en Storage) y devuelve la ruta que se guarda en clientes.logo_path.
 */
async function subirLogo(clienteId: string, archivo: File): Promise<string> {
  const extension = EXTENSIONES[archivo.type];
  if (!extension) {
    fallar("El logo debe ser PNG, SVG, JPG o WebP.");
  }
  if (archivo.size > MAX_LOGO_BYTES) {
    fallar("El logo no puede pesar más de 1 MB.");
  }

  const admin = createAdminClient();
  const ruta = `${clienteId}/${Date.now()}.${extension}`;

  const { error } = await admin.storage.from(BUCKET_LOGOS).upload(ruta, archivo, {
    contentType: archivo.type,
    upsert: true,
  });

  if (error) {
    fallar(`No se pudo subir el logo: ${error.message}`);
  }

  return ruta;
}

/** Borra el archivo viejo después de reemplazarlo, para no dejar basura. */
async function borrarLogo(ruta: string | null) {
  if (!ruta) return;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET_LOGOS).remove([ruta]);
}

export async function createCliente(formData: FormData) {
  const { supabase } = await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const activo = formData.get("activo") != null;

  if (!nombre) {
    fallar("El nombre es obligatorio.");
  }

  const { error } = await supabase.from("clientes").insert({ nombre, activo });
  if (error) {
    fallar(error.message);
  }

  revalidate();
  redirect(PATH);
}

export async function updateCliente(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "").trim();
  const opacidadRaw = String(formData.get("color_opacidad") ?? "").trim();
  const quitarLogo = formData.get("quitar_logo") != null;
  const archivo = formData.get("logo");

  if (!id) {
    fallar("Falta el id del cliente.");
  }
  if (!nombre) {
    fallar("El nombre es obligatorio.");
  }
  if (colorHex && !esHexValido(colorHex)) {
    fallar("El color debe ser un hex de 6 dígitos, por ejemplo #005F95.");
  }

  const { data: actual } = await supabase
    .from("clientes")
    .select("logo_path")
    .eq("id", id)
    .single<{ logo_path: string | null }>();

  const cambios: Record<string, unknown> = {
    nombre,
    color_hex: colorHex || null,
    color_opacidad: limitarOpacidad(opacidadRaw === "" ? null : Number(opacidadRaw)),
  };

  let logoASoltar: string | null = null;

  if (archivo instanceof File && archivo.size > 0) {
    cambios.logo_path = await subirLogo(id, archivo);
    logoASoltar = actual?.logo_path ?? null;
  } else if (quitarLogo) {
    cambios.logo_path = null;
    logoASoltar = actual?.logo_path ?? null;
  }

  const { error } = await supabase.from("clientes").update(cambios).eq("id", id);
  if (error) {
    fallar(error.message);
  }

  await borrarLogo(logoASoltar);

  revalidate();
  redirect(PATH);
}

export async function setClienteActivo(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";

  if (!id) {
    fallar("Falta el id del cliente.");
  }

  const { error } = await supabase.from("clientes").update({ activo }).eq("id", id);
  if (error) {
    fallar(error.message);
  }

  revalidate();
  redirect(PATH);
}

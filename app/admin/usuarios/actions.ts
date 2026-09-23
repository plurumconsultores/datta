"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const USERS_PATH = "/admin/usuarios";

export async function createUser(formData: FormData) {
  // Autorización ANTES de tocar el cliente admin o escribir nada.
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      `${USERS_PATH}?error=${encodeURIComponent("Email y contraseña son obligatorios.")}`,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    redirect(`${USERS_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}

export async function deleteUser(formData: FormData) {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(`${USERS_PATH}?error=${encodeURIComponent("Falta el id del usuario.")}`);
  }

  // Salvaguarda: no permitir auto-eliminarse.
  if (id === user.id) {
    redirect(
      `${USERS_PATH}?error=${encodeURIComponent("No puedes eliminar tu propio usuario.")}`,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    redirect(`${USERS_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}

/**
 * Asigna o quita un rol a un usuario (fila en user_roles).
 * Usa el cliente de SERVIDOR normal: las políticas RLS de admin lo permiten.
 * Se invoca desde un checkbox en el cliente.
 */
export async function setUserRole(
  targetUserId: string,
  roleId: string,
  enabled: boolean,
) {
  const { supabase, user } = await requireAdmin();

  // Salvaguarda: el admin actual no puede quitarse a sí mismo el rol 'admin'.
  if (!enabled && targetUserId === user.id) {
    const { data: role } = await supabase
      .from("roles")
      .select("name")
      .eq("id", roleId)
      .single<{ name: string }>();

    if (role?.name === "admin") {
      throw new Error("No puedes quitarte a ti mismo el rol 'admin'.");
    }
  }

  if (enabled) {
    await supabase
      .from("user_roles")
      .insert({ user_id: targetUserId, role_id: roleId });
  } else {
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("role_id", roleId);
  }

  revalidatePath(USERS_PATH);
}

/**
 * Asigna o quita un cliente a un usuario (fila en usuario_clientes).
 * Cliente de SERVIDOR normal: las políticas RLS de admin lo permiten.
 * Se invoca desde un checkbox en el cliente.
 */
export async function setUserCliente(
  targetUserId: string,
  clienteId: string,
  enabled: boolean,
) {
  const { supabase } = await requireAdmin();

  if (enabled) {
    await supabase
      .from("usuario_clientes")
      .insert({ user_id: targetUserId, cliente_id: clienteId });
  } else {
    await supabase
      .from("usuario_clientes")
      .delete()
      .eq("user_id", targetUserId)
      .eq("cliente_id", clienteId);
  }

  revalidatePath(USERS_PATH);
  revalidatePath("/");
}

/**
 * Enciende o apaga la segregación de datos de un usuario. Los límites ya
 * guardados no se borran: si vuelve a encenderse, quedan como estaban.
 */
export async function setSegregacionUsuario(
  targetUserId: string,
  requiere: boolean,
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("usuario_segregacion")
    .upsert(
      { user_id: targetUserId, requiere, actualizado_en: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(error.message);

  revalidatePath(USERS_PATH);
}

/**
 * Guarda los valores que un usuario puede ver de una variable dentro de un
 * tablero. Sin valores, se borra el renglón: esa variable deja de limitar.
 */
export async function guardarLimite(
  targetUserId: string,
  dashboardSlug: string,
  variable: string,
  valores: string[],
) {
  const { supabase } = await requireAdmin();

  const limpios = [...new Set(valores.filter(Boolean))];

  if (limpios.length === 0) {
    const { error } = await supabase
      .from("usuario_limites")
      .delete()
      .eq("user_id", targetUserId)
      .eq("dashboard_slug", dashboardSlug)
      .eq("variable", variable);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("usuario_limites").upsert(
      {
        user_id: targetUserId,
        dashboard_slug: dashboardSlug,
        variable,
        valores: limpios,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "user_id,dashboard_slug,variable" },
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath(USERS_PATH);
}

/** Deja un tablero sin ninguna limitación para ese usuario. */
export async function limpiarLimites(targetUserId: string, dashboardSlug: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("usuario_limites")
    .delete()
    .eq("user_id", targetUserId)
    .eq("dashboard_slug", dashboardSlug);

  if (error) throw new Error(error.message);

  revalidatePath(USERS_PATH);
}

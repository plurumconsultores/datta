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

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/clientes";

function revalidate() {
  revalidatePath(PATH);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createCliente(formData: FormData) {
  const { supabase } = await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const activo = formData.get("activo") != null;

  if (!nombre) {
    redirect(`${PATH}?error=${encodeURIComponent("El nombre es obligatorio.")}`);
  }

  const { error } = await supabase.from("clientes").insert({ nombre, activo });
  if (error) {
    redirect(`${PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidate();
  redirect(PATH);
}

export async function updateCliente(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!id) {
    redirect(`${PATH}?error=${encodeURIComponent("Falta el id del cliente.")}`);
  }
  if (!nombre) {
    redirect(`${PATH}?error=${encodeURIComponent("El nombre es obligatorio.")}`);
  }

  const { error } = await supabase
    .from("clientes")
    .update({ nombre })
    .eq("id", id);
  if (error) {
    redirect(`${PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidate();
  redirect(PATH);
}

export async function setClienteActivo(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "") === "true";

  if (!id) {
    redirect(`${PATH}?error=${encodeURIComponent("Falta el id del cliente.")}`);
  }

  const { error } = await supabase
    .from("clientes")
    .update({ activo })
    .eq("id", id);
  if (error) {
    redirect(`${PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidate();
  redirect(PATH);
}

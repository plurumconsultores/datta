"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

type DashboardType = "native" | "powerbi";

/**
 * Lee y valida los campos del formulario de tablero.
 * Devuelve el registro listo para insert/update, o un mensaje de error.
 */
function parseDashboardForm(formData: FormData):
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string } {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "") as DashboardType;
  const content = String(formData.get("content") ?? "");
  const embedUrl = String(formData.get("embed_url") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const isActive = formData.get("is_active") != null;
  const clienteIdRaw = String(formData.get("cliente_id") ?? "").trim();

  if (!slug || !title) {
    return { ok: false, error: "El slug y el título son obligatorios." };
  }
  if (type !== "native" && type !== "powerbi") {
    return { ok: false, error: "Tipo de tablero no válido." };
  }
  if (type === "native" && !content.trim()) {
    return { ok: false, error: "Un tablero nativo requiere contenido (HTML)." };
  }
  if (type === "powerbi" && !embedUrl) {
    return { ok: false, error: "Un tablero Power BI requiere una URL de embed." };
  }

  const sortOrder = sortOrderRaw === "" ? 0 : Number(sortOrderRaw);
  if (Number.isNaN(sortOrder)) {
    return { ok: false, error: "El orden debe ser un número." };
  }

  return {
    ok: true,
    row: {
      slug,
      title,
      description: description || null,
      type,
      // Solo guardamos el campo correspondiente al tipo; el otro se limpia.
      content: type === "native" ? content : null,
      embed_url: type === "powerbi" ? embedUrl : null,
      sort_order: sortOrder,
      is_active: isActive,
      // "Interno" (vacío) se guarda como null; si no, el id del cliente.
      cliente_id: clienteIdRaw === "" ? null : clienteIdRaw,
    },
  };
}

export async function createDashboard(formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = parseDashboardForm(formData);
  if (!parsed.ok) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabase.from("dashboards").insert(parsed.row);
  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export async function updateDashboard(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(`/admin?error=${encodeURIComponent("Falta el id del tablero.")}`);
  }

  const parsed = parseDashboardForm(formData);
  if (!parsed.ok) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabase
    .from("dashboards")
    .update(parsed.row)
    .eq("id", id);
  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

export async function deleteDashboard(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(`/admin?error=${encodeURIComponent("Falta el id del tablero.")}`);
  }

  const { error } = await supabase.from("dashboards").delete().eq("id", id);
  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}

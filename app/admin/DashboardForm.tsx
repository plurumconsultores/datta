"use client";

import { useState } from "react";

type DashboardType = "native" | "powerbi";

export type DashboardFormValues = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  type?: DashboardType;
  content?: string | null;
  embed_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  cliente_id?: string | null;
};

const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-ink";

export function DashboardForm({
  action,
  clientes,
  initial = {},
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clientes: { id: string; nombre: string }[];
  initial?: DashboardFormValues;
  submitLabel: string;
}) {
  const [type, setType] = useState<DashboardType>(initial.type ?? "native");

  return (
    <form action={action} className="flex flex-col gap-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Slug
          <input
            name="slug"
            required
            defaultValue={initial.slug ?? ""}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Título
          <input
            name="title"
            required
            defaultValue={initial.title ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Descripción
        <input
          name="description"
          defaultValue={initial.description ?? ""}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Cliente
        <select
          name="cliente_id"
          defaultValue={initial.cliente_id ?? ""}
          className={inputClass}
        >
          <option value="">Interno</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          Tipo
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as DashboardType)}
            className={inputClass}
          >
            <option value="native">Nativo</option>
            <option value="powerbi">Power BI</option>
          </select>
        </label>

        <label className={labelClass}>
          Orden
          <input
            name="sort_order"
            type="number"
            defaultValue={initial.sort_order ?? 0}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={initial.is_active ?? true}
            className="h-4 w-4"
          />
          Activo
        </label>
      </div>

      {type === "native" ? (
        <label className={labelClass}>
          Contenido (HTML)
          <textarea
            name="content"
            rows={6}
            defaultValue={initial.content ?? ""}
            className={`${inputClass} font-mono`}
          />
        </label>
      ) : (
        <label className={labelClass}>
          URL de embed (Power BI)
          <input
            name="embed_url"
            type="url"
            defaultValue={initial.embed_url ?? ""}
            className={inputClass}
          />
        </label>
      )}

      <button
        type="submit"
        className="w-fit rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { TypeChip } from "./TypeChip";
import { useClienteFilter } from "./ClienteFilter";

export type DashboardCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: "native" | "powerbi";
  cliente_id: string | null;
};

export function DashboardGrid({ dashboards }: { dashboards: DashboardCard[] }) {
  const { selected } = useClienteFilter();

  const items = dashboards.filter((dashboard) => {
    if (selected === "todos") return true;
    if (selected === "internos") return dashboard.cliente_id === null;
    return dashboard.cliente_id === selected;
  });

  if (dashboards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
        No tienes tableros asignados
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
        No hay tableros para esta selección
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((dashboard) => (
        <li key={dashboard.id}>
          <Link
            href={`/d/${dashboard.slug}`}
            className="flex h-full flex-col gap-3 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
          >
            <TypeChip type={dashboard.type} />
            <h2 className="text-lg font-semibold text-ink">{dashboard.title}</h2>
            {dashboard.description && (
              <p className="text-sm text-muted">{dashboard.description}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

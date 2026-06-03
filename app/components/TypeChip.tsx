type DashboardType = "native" | "powerbi";

const LABELS: Record<DashboardType, string> = {
  native: "Nativo",
  powerbi: "Power BI",
};

const STYLES: Record<DashboardType, string> = {
  // Nativo: relleno azul predominante, texto blanco.
  native: "bg-brand-900 text-white",
  // Power BI: contorno azul, texto azul.
  powerbi: "border border-brand-700 text-brand-700",
};

export function TypeChip({ type }: { type: DashboardType }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}

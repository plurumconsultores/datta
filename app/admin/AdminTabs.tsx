import Link from "next/link";

type TabKey = "tableros" | "clientes" | "usuarios";

const TABS: { key: TabKey; href: string; label: string }[] = [
  { key: "tableros", href: "/admin", label: "Tableros" },
  { key: "clientes", href: "/admin/clientes", label: "Clientes" },
  { key: "usuarios", href: "/admin/usuarios", label: "Usuarios" },
];

export function AdminTabs({ active }: { active: TabKey }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={
            tab.key === active
              ? "rounded-md bg-brand-900 px-3 py-1.5 text-sm font-medium text-white"
              : "rounded-md border border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

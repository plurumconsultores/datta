"use client";

import { useState, useTransition } from "react";
import { setRoleDashboard } from "./actions";

export function RoleCheckbox({
  dashboardId,
  roleId,
  label,
  initialChecked,
}: {
  dashboardId: string;
  roleId: string;
  label: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        className="h-4 w-4"
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          startTransition(async () => {
            await setRoleDashboard(dashboardId, roleId, next);
          });
        }}
      />
      {label}
    </label>
  );
}

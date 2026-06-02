"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "./actions";

export function UserRoleCheckbox({
  userId,
  roleId,
  label,
  initialChecked,
}: {
  userId: string;
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
            try {
              await setUserRole(userId, roleId, next);
            } catch (err) {
              // El servidor rechazó el cambio (p. ej. la salvaguarda de admin):
              // revertimos la casilla y avisamos.
              setChecked(!next);
              alert(err instanceof Error ? err.message : "No se pudo guardar.");
            }
          });
        }}
      />
      {label}
    </label>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setUserCliente } from "./actions";

export function UserClienteCheckbox({
  userId,
  clienteId,
  label,
  initialChecked,
}: {
  userId: string;
  clienteId: string;
  label: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink">
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
              await setUserCliente(userId, clienteId, next);
            } catch (err) {
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

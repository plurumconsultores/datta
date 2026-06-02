"use client";

import { deleteUser } from "./actions";

export function DeleteUserButton({
  id,
  email,
  disabled,
}: {
  id: string;
  email: string;
  disabled?: boolean;
}) {
  return (
    <form action={deleteUser}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={disabled}
        onClick={(e) => {
          if (!confirm(`¿Eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) {
            e.preventDefault();
          }
        }}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Eliminar
      </button>
    </form>
  );
}

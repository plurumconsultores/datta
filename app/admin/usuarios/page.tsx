import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUser } from "./actions";
import { UserRoleCheckbox } from "./UserRoleCheckbox";
import { DeleteUserButton } from "./DeleteUserButton";

type Role = { id: string; name: string };
type UserRole = { user_id: string; role_id: string };

const cardClass =
  "rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

function formatDate(value: string | undefined) {
  if (!value) return "—";
  // Formato estable e independiente del locale del servidor.
  return new Date(value).toISOString().slice(0, 10);
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, user: currentUser } = await requireAdmin();
  const { error } = await searchParams;

  // Usuarios: API de administración (cliente admin, llave secreta).
  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const users = usersData?.users ?? [];

  // Roles y asignaciones: cliente de servidor normal (sesión + RLS de admin).
  const [{ data: roles }, { data: userRoles }] = await Promise.all([
    supabase.from("roles").select("id, name").order("name"),
    supabase.from("user_roles").select("user_id, role_id"),
  ]);

  const allRoles = (roles ?? []) as Role[];
  const assigned = new Set(
    ((userRoles ?? []) as UserRole[]).map((ur) => `${ur.user_id}:${ur.role_id}`),
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-zinc-900">
        <Link
          href="/admin"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Volver a administración
        </Link>
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Usuarios
        </h1>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {/* Crear usuario */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Crear usuario
          </h2>
          <div className={cardClass}>
            <form
              action={createUser}
              className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Contraseña
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                className="h-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Crear
              </button>
            </form>
          </div>
        </section>

        {/* Listado de usuarios */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Usuarios ({users.length})
          </h2>

          {users.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay usuarios.
            </p>
          ) : (
            users.map((u) => (
              <div key={u.id} className={cardClass}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {u.email ?? "(sin email)"}
                      {u.id === currentUser.id && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          tú
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Creado el {formatDate(u.created_at)}
                    </p>
                  </div>
                  <DeleteUserButton
                    id={u.id}
                    email={u.email ?? u.id}
                    disabled={u.id === currentUser.id}
                  />
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {allRoles.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No hay roles definidos.
                    </p>
                  ) : (
                    allRoles.map((role) => (
                      <UserRoleCheckbox
                        key={role.id}
                        userId={u.id}
                        roleId={role.id}
                        label={role.name}
                        initialChecked={assigned.has(`${u.id}:${role.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

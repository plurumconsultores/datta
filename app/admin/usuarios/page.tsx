import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/app/components/AppShell";
import { AdminTabs } from "../AdminTabs";
import { createUser } from "./actions";
import { UserRoleCheckbox } from "./UserRoleCheckbox";
import { UserClienteCheckbox } from "./UserClienteCheckbox";
import { DeleteUserButton } from "./DeleteUserButton";

type Role = { id: string; name: string };
type UserRole = { user_id: string; role_id: string };
type Cliente = { id: string; nombre: string };
type UserCliente = { user_id: string; cliente_id: string };

const cardClass = "rounded-xl border border-ink/10 bg-surface p-5 shadow-sm";
const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";

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

  // Roles, clientes y asignaciones: cliente de servidor normal (RLS de admin).
  const [
    { data: roles },
    { data: userRoles },
    { data: clientes },
    { data: userClientes },
  ] = await Promise.all([
    supabase.from("roles").select("id, name").order("name"),
    supabase.from("user_roles").select("user_id, role_id"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("usuario_clientes").select("user_id, cliente_id"),
  ]);

  const allRoles = (roles ?? []) as Role[];
  const allClientes = (clientes ?? []) as Cliente[];
  const assignedRoles = new Set(
    ((userRoles ?? []) as UserRole[]).map((ur) => `${ur.user_id}:${ur.role_id}`),
  );
  const assignedClientes = new Set(
    ((userClientes ?? []) as UserCliente[]).map(
      (uc) => `${uc.user_id}:${uc.cliente_id}`,
    ),
  );

  return (
    <AppShell title="Usuarios" active="admin" isAdmin userEmail={currentUser.email}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
        <AdminTabs active="usuarios" />

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Crear usuario */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Crear usuario
          </h2>
          <div className={cardClass}>
            <form
              action={createUser}
              className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
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
                className="h-fit rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Crear
              </button>
            </form>
          </div>
        </section>

        {/* Listado de usuarios */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Usuarios ({users.length})
          </h2>

          {users.length === 0 ? (
            <p className="text-sm text-muted">No hay usuarios.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className={cardClass}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">
                      {u.email ?? "(sin email)"}
                      {u.id === currentUser.id && (
                        <span className="ml-2 rounded-full bg-page px-2 py-0.5 text-xs font-normal text-muted">
                          tú
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      Creado el {formatDate(u.created_at)}
                    </p>
                  </div>
                  <DeleteUserButton
                    id={u.id}
                    email={u.email ?? u.id}
                    disabled={u.id === currentUser.id}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Roles
                    </p>
                    {allRoles.length === 0 ? (
                      <p className="text-sm text-muted">
                        No hay roles definidos.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {allRoles.map((role) => (
                          <UserRoleCheckbox
                            key={role.id}
                            userId={u.id}
                            roleId={role.id}
                            label={role.name}
                            initialChecked={assignedRoles.has(
                              `${u.id}:${role.id}`,
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Clientes
                    </p>
                    {allClientes.length === 0 ? (
                      <p className="text-sm text-muted">
                        No hay clientes definidos.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {allClientes.map((cliente) => (
                          <UserClienteCheckbox
                            key={cliente.id}
                            userId={u.id}
                            clienteId={cliente.id}
                            label={cliente.nombre}
                            initialChecked={assignedClientes.has(
                              `${u.id}:${cliente.id}`,
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}

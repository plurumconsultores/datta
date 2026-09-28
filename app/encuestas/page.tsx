import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/AppShell";
import { qrDeUrl, urlPublica } from "@/lib/qr";
import { TarjetaEncuesta } from "./TarjetaEncuesta";

/*
 * Lo que ve un cliente de sus encuestas: el enlace para compartirlo y el QR
 * para descargarlo. Nada más — ni el editor, ni las preguntas, ni las
 * respuestas una por una. Qué encuestas llegan aquí lo decide RLS: las de sus
 * clientes que el equipo de Plurum marcó como visibles.
 */

type Fila = {
  id: string;
  slug: string;
  titulo: string;
  estado: "borrador" | "publicada" | "cerrada";
  cliente_id: number | null;
};

export default async function EncuestasCompartidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: isAdmin }, { data: esEquipo }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("puede_ver_todo"),
  ]);

  const { data } = await supabase
    .from("encuestas")
    .select("id, slug, titulo, estado, cliente_id")
    .neq("estado", "borrador")
    .order("actualizado_en", { ascending: false });

  const encuestas = (data ?? []) as Fila[];

  const cabeceras = await headers();
  const host = cabeceras.get("host");
  const proto = cabeceras.get("x-forwarded-proto");

  const conEnlace = await Promise.all(
    encuestas.map(async (encuesta) => {
      const url = urlPublica(host, proto, encuesta.slug);
      return { ...encuesta, url, qr: await qrDeUrl(url) };
    }),
  );

  return (
    <AppShell
      title="Encuestas"
      active="encuestas"
      isAdmin={Boolean(isAdmin)}
      esEquipo={Boolean(esEquipo)}
      userEmail={user.email}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Encuestas para compartir
          </h2>
          <p className="mt-1 text-sm text-muted">
            Comparte el enlace o descarga el código QR. Quien lo reciba puede responder
            sin tener cuenta en Datta.
          </p>
        </div>

        {conEnlace.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 bg-surface px-6 py-16 text-center text-muted">
            Todavía no hay encuestas compartidas contigo.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {conEnlace.map((encuesta) => (
              <TarjetaEncuesta
                key={encuesta.id}
                titulo={encuesta.titulo}
                url={encuesta.url}
                qr={encuesta.qr}
                slug={encuesta.slug}
                abierta={encuesta.estado === "publicada"}
              />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

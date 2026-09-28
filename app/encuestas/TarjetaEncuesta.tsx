"use client";

import { useState } from "react";

/** Una encuesta compartida: su enlace, su QR y nada más. */
export function TarjetaEncuesta({
  titulo,
  url,
  qr,
  slug,
  abierta,
}: {
  titulo: string;
  url: string;
  qr: string | null;
  slug: string;
  abierta: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el enlace está a la vista.
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink">{titulo}</h3>
          <span
            className={
              abierta
                ? "rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-medium text-white"
                : "rounded-full border border-ink/20 bg-page px-2.5 py-0.5 text-xs font-medium text-muted"
            }
          >
            {abierta ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <code className="truncate rounded-md bg-page px-3 py-2 font-mono text-sm text-ink">
          {url}
        </code>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copiar}
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            {copiado ? "Enlace copiado" : "Copiar el enlace"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-brand-700 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
          >
            Abrir
          </a>
        </div>

        {!abierta && (
          <p className="text-sm text-muted">
            Está cerrada: quien abra el enlace verá el aviso y no podrá responder.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2">
        {qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`Código QR de ${titulo}`}
              className="h-40 w-40 rounded-lg border border-ink/10 bg-white p-2"
            />
            <a
              href={qr}
              download={`qr-${slug}.png`}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Descargar el QR
            </a>
          </>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-ink/20 p-3 text-center text-xs text-muted">
            El código QR no está disponible.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { mostrarAlCliente } from "../actions";

/**
 * El enlace público y su QR. El enlace se copia al portapapeles con un clic,
 * que es como termina viajando a WhatsApp o al correo.
 */
export function CompartirEncuesta({
  encuestaId,
  url,
  qr,
  slug,
  activa,
  esInterna,
  visibleInicial,
}: {
  encuestaId: string;
  url: string;
  qr: string | null;
  slug: string;
  activa: boolean;
  esInterna: boolean;
  visibleInicial: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const [visible, setVisible] = useState(visibleInicial);
  const [avisoVisible, setAvisoVisible] = useState<string | null>(null);

  async function cambiarVisibilidad(valor: boolean) {
    setVisible(valor);
    setAvisoVisible(null);
    try {
      await mostrarAlCliente(encuestaId, valor);
    } catch (err) {
      setVisible(!valor);
      setAvisoVisible(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador que no deja copiar: el enlace está a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ink/10 bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Enlace y QR</h2>
        {!activa && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            La encuesta no está abierta: el enlace no recibe respuestas
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-page px-3 py-2 font-mono text-sm text-ink">
              {url}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="rounded-md bg-brand-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-brand-700 px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
            >
              Abrir
            </a>
          </div>
          <p className="text-sm text-muted">
            Quien abra este enlace no necesita cuenta de Datta. Sirve igual pegado en
            un correo, en WhatsApp o detrás del QR.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={`Código QR de la encuesta ${slug}`}
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
              Falta instalar el generador de QR:
              <br />
              <code className="mt-1 block font-mono">npm install qrcode</code>
            </div>
          )}
        </div>
      </div>

      {/* Compartir con el cliente */}
      <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={visible}
            disabled={esInterna}
            onChange={(e) => cambiarVisibilidad(e.target.checked)}
            className="h-4 w-4"
          />
          Mostrarle el enlace y el QR al cliente
        </label>

        <p className="text-sm text-muted">
          {esInterna
            ? "Esta encuesta es interna: asígnale un cliente si quieres compartírsela."
            : visible
              ? "El cliente ve esta encuesta en su sección Encuestas, con el enlace y el QR para descargar. No ve el editor, ni las preguntas, ni las respuestas una por una."
              : "Mientras esté apagado, la encuesta solo se ve desde Plurum. Enciéndelo cuando esté lista para que el cliente la comparta."}
        </p>

        {avisoVisible && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {avisoVisible}
          </p>
        )}
      </div>
    </div>
  );
}

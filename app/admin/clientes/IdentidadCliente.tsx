"use client";

import { useState } from "react";
import {
  COLOR_PLURUM,
  OPACIDAD_MAXIMA,
  colorCliente,
  inicialesCliente,
  limitarOpacidad,
} from "@/lib/clientes";

const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";

/**
 * Identidad del cliente dentro del formulario de /admin/clientes: logo, color
 * y transparencia, con una vista previa de cómo se verá su sección en el
 * portal al pasar el cursor.
 */
export function IdentidadCliente({
  nombre,
  logoActual,
  colorInicial,
  opacidadInicial,
}: {
  nombre: string;
  logoActual: string | null;
  colorInicial: string | null;
  opacidadInicial: number | null;
}) {
  const [color, setColor] = useState(colorCliente(colorInicial));
  const [hexTexto, setHexTexto] = useState(colorCliente(colorInicial));
  const [opacidad, setOpacidad] = useState(limitarOpacidad(opacidadInicial));
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(logoActual);
  const [quitar, setQuitar] = useState(false);

  const tinte = (() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacidad / 100})`;
  })();

  function cambiarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setVistaPrevia(URL.createObjectURL(archivo));
    setQuitar(false);
  }

  function escribirHex(valor: string) {
    setHexTexto(valor);
    if (/^#[0-9a-fA-F]{6}$/.test(valor)) setColor(valor.toUpperCase());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-page">
            {vistaPrevia && !quitar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vistaPrevia}
                alt={`Logo de ${nombre}`}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span
                style={{ backgroundColor: color }}
                className="flex h-full w-full items-center justify-center text-base font-bold text-white"
              >
                {inicialesCliente(nombre)}
              </span>
            )}
          </div>

          <label className="cursor-pointer rounded-md border border-brand-700 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-white">
            {vistaPrevia && !quitar ? "Cambiar logo" : "Subir logo"}
            <input
              type="file"
              name="logo"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={(e) => cambiarArchivo(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
        </div>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-medium text-ink">
          Nombre
          <input name="nombre" defaultValue={nombre} required className={inputClass} />
        </label>

        <label className="flex w-40 flex-col gap-1 text-sm font-medium text-ink">
          Color (hex)
          <span className="flex items-center gap-2 rounded-md border border-ink/15 bg-surface px-2 py-1.5">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value.toUpperCase());
                setHexTexto(e.target.value.toUpperCase());
              }}
              aria-label="Elegir color del cliente"
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <input
              name="color_hex"
              value={hexTexto}
              onChange={(e) => escribirHex(e.target.value)}
              onBlur={() => setHexTexto(color)}
              spellCheck={false}
              placeholder={COLOR_PLURUM}
              className="w-full min-w-0 bg-transparent font-mono text-sm text-ink outline-none"
            />
          </span>
        </label>

        <label className="flex w-48 flex-col gap-1 text-sm font-medium text-ink">
          <span className="flex justify-between">
            Transparencia <span className="font-normal text-muted">{opacidad} %</span>
          </span>
          <input
            name="color_opacidad"
            type="range"
            min={0}
            max={OPACIDAD_MAXIMA}
            value={opacidad}
            onChange={(e) => setOpacidad(Number(e.target.value))}
            className="w-full accent-brand-900"
          />
        </label>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-dashed border-ink/15 px-5 py-4"
        style={{
          backgroundImage: `radial-gradient(58% 130% at 16% -10%, ${tinte}, transparent 70%), radial-gradient(45% 120% at 88% -20%, ${tinte}, transparent 75%)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {vistaPrevia && !quitar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vistaPrevia} alt="" aria-hidden className="h-7 w-auto max-w-[120px] object-contain" />
          ) : (
            <span
              style={{ backgroundColor: color }}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[11px] font-bold text-white"
            >
              {inicialesCliente(nombre)}
            </span>
          )}
          <span className="text-base font-bold text-ink">{nombre}</span>
          <span className="text-sm text-muted">
            Así se ve su sección en el portal al pasar el cursor
          </span>
        </div>
      </div>

      {logoActual && (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="quitar_logo"
            checked={quitar}
            onChange={(e) => setQuitar(e.target.checked)}
            className="h-4 w-4"
          />
          Quitar el logo y volver a las iniciales
        </label>
      )}
    </div>
  );
}

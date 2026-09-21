/**
 * Identidad visual de un cliente: su logo, su color y qué tan fuerte se
 * difumina ese color detrás de su sección en el portal. Todo se administra en
 * /admin/clientes; aquí solo viven los helpers compartidos.
 */

/** Bucket público de Supabase Storage donde se guardan los logos. */
export const BUCKET_LOGOS = "clientes-logos";

/** Azul Plurum: lo usan los tableros internos y los clientes sin color. */
export const COLOR_PLURUM = "#005F95";

/** Transparencia por defecto del difuminado, en porcentaje. */
export const OPACIDAD_POR_DEFECTO = 15;

/** Tope de transparencia: más arriba el texto de las tarjetas pierde contraste. */
export const OPACIDAD_MAXIMA = 60;

export type ClienteIdentidad = {
  id: string;
  nombre: string;
  logo_path?: string | null;
  color_hex?: string | null;
  color_opacidad?: number | null;
};

/** URL pública del logo en Storage. Null si el cliente todavía no tiene. */
export function urlLogo(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET_LOGOS}/${logoPath}`;
}

export function esHexValido(valor: string | null | undefined): boolean {
  return typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor);
}

/** El hex del cliente, o el azul Plurum si no tiene uno válido. */
export function colorCliente(hex: string | null | undefined): string {
  return esHexValido(hex) ? (hex as string).toUpperCase() : COLOR_PLURUM;
}

export function limitarOpacidad(valor: number | null | undefined): number {
  const n = typeof valor === "number" && Number.isFinite(valor) ? valor : OPACIDAD_POR_DEFECTO;
  return Math.min(Math.max(Math.round(n), 0), OPACIDAD_MAXIMA);
}

/**
 * Color del difuminado listo para CSS: el hex del cliente con su transparencia.
 * Se inyecta como la variable --tinte de la sección (ver globals.css).
 */
export function tinteCliente(
  hex: string | null | undefined,
  opacidad: number | null | undefined,
): string {
  const color = colorCliente(hex);
  const alpha = limitarOpacidad(opacidad) / 100;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Iniciales de respaldo mientras el cliente no tenga logo cargado. */
export function inicialesCliente(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

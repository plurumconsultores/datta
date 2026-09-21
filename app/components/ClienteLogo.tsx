import { colorCliente, inicialesCliente } from "@/lib/clientes";

/**
 * Marca del cliente: su logo si ya lo cargaron en /admin/clientes, y si no un
 * cuadro con las iniciales pintado con su color. El nombre siempre va al lado,
 * así que el cuadro de iniciales no aporta información nueva al lector.
 */
export function ClienteLogo({
  nombre,
  logo,
  color,
  tamano = 30,
}: {
  nombre: string;
  logo: string | null;
  color: string;
  tamano?: number;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        aria-hidden
        style={{ height: tamano }}
        className="w-auto max-w-[130px] shrink-0 object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: tamano, height: tamano, backgroundColor: colorCliente(color) }}
      className="flex shrink-0 items-center justify-center rounded-lg text-[11px] font-bold leading-none text-white"
    >
      {inicialesCliente(nombre)}
    </span>
  );
}

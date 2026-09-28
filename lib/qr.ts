import "server-only";

/**
 * Dibuja un QR y lo devuelve como data URL, listo para un <img>.
 *
 * El paquete se carga a mano y con red de seguridad: si no está instalado
 * (`npm install qrcode`), la página sigue funcionando y muestra el aviso en
 * lugar del código.
 */
export async function qrDeUrl(url: string): Promise<string | null> {
  try {
    const paquete = "qrcode";
    const mod = await import(paquete);
    const QR = (mod.default ?? mod) as {
      toDataURL: (t: string, o?: unknown) => Promise<string>;
    };
    return await QR.toDataURL(url, {
      width: 640,
      margin: 1,
      color: { dark: "#1b2a17", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

/** La dirección pública de una encuesta, a partir de las cabeceras. */
export function urlPublica(host: string | null, proto: string | null, slug: string) {
  const dominio = host ?? "localhost:3000";
  const esquema = proto ?? (dominio.startsWith("localhost") ? "http" : "https");
  return `${esquema}://${dominio}/e/${slug}`;
}

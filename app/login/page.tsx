import Image from "next/image";
import { login } from "./actions";

const inputClass =
  "rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-300/40";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden md:flex-row">
      {/* Franja azul compacta (solo móvil) */}
      <div className="relative flex items-center gap-3 overflow-hidden bg-brand-900 px-5 py-6 md:hidden">
        {/* Imagen de fondo (cover) sobre el color --brand-900 */}
        <Image
          src="/loginazul.svg"
          alt=""
          aria-hidden
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Overlay para contraste del texto */}
        <div aria-hidden className="absolute inset-0 bg-brand-900/40" />

        <Image
          src="/plurum-blanco.svg"
          alt="Plurum"
          width={110}
          height={45}
          priority
          unoptimized
          className="relative h-8 w-auto"
        />
        <span className="relative text-2xl font-bold text-white">Datta</span>
      </div>

      {/* Columna izquierda de marca (desktop) */}
      <div className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white md:flex">
        {/* Imagen de fondo (cover) sobre el color --brand-900 */}
        <Image
          src="/loginazul.svg"
          alt=""
          aria-hidden
          fill
          priority
          unoptimized
          sizes="46vw"
          className="object-cover object-center"
        />
        {/* Overlay azul semitransparente para asegurar contraste del texto */}
        <div aria-hidden className="absolute inset-0 bg-brand-900/40" />

        <div className="relative">
          <Image
            src="/plurum-blanco.svg"
            alt="Plurum"
            width={150}
            height={61}
            priority
            unoptimized
            className="h-12 w-auto"
          />
        </div>

        <div className="relative">
          <h2 className="text-5xl font-bold tracking-tight text-white">Datta</h2>
          <p className="mt-3 max-w-sm text-lg text-white">
            Tus tableros de analítica, en{" "}
            <span className="whitespace-nowrap">un solo lugar.</span>
          </p>
        </div>
      </div>

      {/* Columna derecha: formulario */}
      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa con tu cuenta de Plurum
          </p>

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <form action={login} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Contraseña
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

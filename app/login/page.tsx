import Image from "next/image";
import { login } from "./actions";
import { CaritaPlurum, FondoPlurum } from "./FondoPlurum";

/**
 * Supabase responde en inglés y con frases que no le dicen nada a quien entra.
 * Las conocidas se traducen; cualquier otra se muestra tal cual, para no
 * esconder información al diagnosticar.
 */
function enCastellano(error: string): string {
  const conocidos: Record<string, string> = {
    "Invalid login credentials": "El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.",
    "Email not confirmed": "Esta cuenta todavía no está confirmada. Escríbele al equipo de Plurum.",
    "Email logins are disabled": "El ingreso con correo está desactivado en este momento.",
  };
  return conocidos[error] ?? error;
}

const etiquetaClass = "flex flex-col gap-1.5 text-[13px] font-semibold text-ink";
const campoClass =
  "relative flex items-center rounded-2xl border border-ink/15 bg-surface transition focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgba(35,232,232,0.28)]";
const entradaClass =
  "w-full rounded-2xl border-0 bg-transparent py-3.5 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-muted/60";
const iconoClass =
  "pointer-events-none absolute left-3.5 h-[17px] w-[17px] stroke-muted stroke-[1.7] [fill:none]";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-escena relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <FondoPlurum />

      <div className="relative mb-14 flex justify-center">
        <Image
          src="/plurum-blanco.svg"
          alt="Plurum"
          width={233}
          height={95}
          priority
          unoptimized
          className="h-[34px] w-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
        />
      </div>

      <div className="login-tarjeta relative w-full max-w-[420px] rounded-[28px] bg-surface/[0.97] px-6 pb-8 pt-[66px] shadow-[0_30px_70px_-24px_rgba(12,24,8,0.55),0_2px_8px_rgba(12,24,8,0.12)] backdrop-blur-sm sm:px-8">
        {/* La carita saluda desde el borde de la tarjeta, con el color del
            momento: el mismo ciclo del fondo. */}
        <div className="login-color absolute -top-11 left-1/2 flex h-[88px] w-[88px] -translate-x-1/2 items-center justify-center rounded-[28px] shadow-[0_14px_30px_-8px_rgba(12,24,8,0.62),inset_0_1px_0_rgba(255,255,255,0.3)]">
          <CaritaPlurum className="h-11 w-auto fill-white" />
        </div>

        <h1 className="text-center text-[27px] font-bold tracking-tight text-ink">Datta</h1>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-muted">
          Tus tableros de analítica, en un solo lugar.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="mt-px h-4 w-4 shrink-0 stroke-current stroke-[1.8] [fill:none]"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4.5M12 16h.01" />
            </svg>
            <span>{enCastellano(error)}</span>
          </div>
        )}

        <form action={login} className="mt-6 flex flex-col gap-4">
          <label className={etiquetaClass}>
            Correo
            <span className={campoClass}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={iconoClass}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="M3.5 7l8.5 6 8.5-6" />
              </svg>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="nombre@plurum.co"
                className={entradaClass}
              />
            </span>
          </label>

          <label className={etiquetaClass}>
            Contraseña
            <span className={campoClass}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={iconoClass}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 018 0v3" />
              </svg>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={entradaClass}
              />
            </span>
          </label>

          <button
            type="submit"
            className="login-color login-color-boton mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(12,24,8,0.75)] transition hover:-translate-y-px hover:brightness-110 hover:saturate-[1.06] active:translate-y-0"
          >
            Entrar
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-[17px] w-[17px] stroke-current stroke-2 [fill:none]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          Acceso para el equipo de <span className="font-semibold text-brand-700">Plurum</span> y
          sus clientes.
        </p>
      </div>

      <p className="relative mt-7 flex items-center gap-2 text-xs text-white/60">
        <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
        Plurum · {new Date().getFullYear()}
      </p>
    </main>
  );
}

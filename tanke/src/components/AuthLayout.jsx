import { Link } from "react-router-dom";
import { useHiddenSiteFooter } from "../hooks/useHiddenSiteFooter";
import { useTheme } from "../hooks/useTheme";
import { BellIcon, ChartLineIcon, HeartFillIcon } from "../icons";
import { DarkToggle } from "./DarkToggle";

// Lo que se gana al registrarse, en los términos de la app. Sin esto el
// formulario pide datos sin decir para qué.
const BENEFITS = [
  {
    icon: HeartFillIcon,
    title: "Guarda tus gasolineras",
    text: "Las que usas de verdad, con su precio de hoy al abrir la cuenta.",
  },
  {
    icon: BellIcon,
    title: "Avisos de precio",
    text: "Dinos tu tope por litro y te decimos cuándo alguna baja de ahí.",
  },
  {
    icon: ChartLineIcon,
    title: "Histórico de Canarias",
    text: "Guardamos el precio cada día para saber si merece la pena esperar.",
  },
];

function Wordmark() {
  return (
    <Link
      to="/"
      className="inline-flex items-baseline text-2xl font-black tracking-tighter text-white"
    >
      Tanke<span className="text-indigo-400">.</span>
    </Link>
  );
}

export function AuthLayout({ title, intro, children, footer }) {
  const [isDark, setIsDark] = useTheme();
  useHiddenSiteFooter();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      {/* El formulario va primero en móvil: quien entra a /login viene a
          escribir su email, no a leer la propuesta de valor. */}
      <main className="order-1 lg:order-2 flex flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <Link
            to="/"
            className="lg:hidden inline-flex items-baseline text-xl font-black tracking-tighter text-slate-900 dark:text-white"
          >
            Tanke<span className="text-indigo-600 dark:text-indigo-400">.</span>
          </Link>
          <DarkToggle isDark={isDark} setIsDark={setIsDark} />
        </div>

        <div className="flex-1 flex items-center justify-center py-8 lg:py-12">
          <div className="w-full max-w-md motion-safe:animate-[auth-rise_560ms_cubic-bezier(0.16,1,0.3,1)_both]">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-balance">
              {title}
            </h1>
            {intro && (
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                {intro}
              </p>
            )}
            <div className="mt-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_20px_48px_-28px_rgb(15_23_42/0.5)]">
              {children}
            </div>
            {footer && (
              <div className="mt-6 text-sm text-slate-600 dark:text-slate-300">
                {footer}
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="order-2 lg:order-1 relative isolate overflow-hidden bg-slate-900 px-6 py-10 sm:px-10 lg:px-12 lg:py-14 flex flex-col">
        <picture className="contents">
          <source
            type="image/avif"
            srcSet="/hero-640.avif 640w, /hero-960.avif 960w, /hero-1440.avif 1440w"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          <img
            src="/hero-960.webp"
            srcSet="/hero-640.webp 640w, /hero-960.webp 960w, /hero-1440.webp 1440w"
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-900/85 to-indigo-950/90"
        />

        {/* La marca ya va arriba en móvil; aquí solo desde lg. */}
        <div className="hidden lg:block">
          <Wordmark />
        </div>

        <div className="lg:mt-auto lg:pt-16">
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-white text-balance max-w-sm">
            El buscador es público. La cuenta es para no repetir la búsqueda
            cada semana.
          </p>
          <ul className="mt-8 space-y-5 max-w-md">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <li key={benefit.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">
                      {benefit.title}
                    </span>
                    <span className="block text-sm leading-relaxed text-indigo-100/75">
                      {benefit.text}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 text-xs font-medium text-indigo-200/70">
            Precios oficiales del Ministerio para la Transición Ecológica.
          </p>
        </div>
      </aside>
    </div>
  );
}

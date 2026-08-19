import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHiddenSiteFooter } from "../hooks/useHiddenSiteFooter";
import { useTheme } from "../hooks/useTheme";
import { GearIcon, NewspaperIcon, SignInIcon, UserIcon } from "../icons";
import { DarkToggle } from "./DarkToggle";

const linkClass = ({ isActive }) =>
  `inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-white/85 hover:bg-white/10 hover:text-white"
  }`;

export function AppChrome({
  variant = "page",
  isDark: isDarkProp,
  setIsDark: setIsDarkProp,
}) {
  const { user } = useAuth();
  const localTheme = useTheme();
  const isDark = isDarkProp ?? localTheme[0];
  const setIsDark = setIsDarkProp ?? localTheme[1];

  // Sobre la foto del hero la navegación necesita el mismo material que el
  // interruptor de tema: sin superficie eran dos iconos sueltos que nadie
  // leía como enlaces, y «Guías» y «Entrar» son la puerta a toda la cuenta.
  const navSurface =
    variant === "hero"
      ? "rounded-full border border-white/20 bg-slate-900/50 p-1 shadow-xl backdrop-blur-md"
      : "";

  const nav = (
    <nav
      aria-label="Principal"
      className={`flex items-center justify-end gap-0.5 ${
        variant === "hero" ? navSurface : "flex-wrap"
      }`}
    >
      <NavLink to="/guias" className={linkClass}>
        <NewspaperIcon className="w-4 h-4" />
        Guías
      </NavLink>
      {user ? (
        <NavLink to="/cuenta" className={linkClass}>
          <UserIcon className="w-4 h-4" />
          Cuenta
        </NavLink>
      ) : (
        <NavLink to="/login" className={linkClass}>
          <SignInIcon className="w-4 h-4" />
          Entrar
        </NavLink>
      )}
      {/* El rótulo de Admin sí se esconde en móvil: es el único enlace que
          nunca ve un visitante y con las tres etiquetas no cabe el logo. */}
      {user?.role === "admin" && (
        <NavLink
          to="/admin"
          className={linkClass}
          aria-label="Panel de administración"
          title="Panel de administración"
        >
          <GearIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Admin</span>
        </NavLink>
      )}
    </nav>
  );

  // Se ancla al hero completo, no al bloque de texto centrado: si cuelga del
  // contenedor centrado, `top` cae a la altura del wordmark y lo tapa.
  if (variant === "hero") {
    return (
      <div className="absolute inset-x-0 top-4 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4">
          {nav}
          <DarkToggle isDark={isDark} setIsDark={setIsDark} />
        </div>
      </div>
    );
  }

  return (
    <header className="bg-slate-900 text-white">
      {/* Con las etiquetas visibles, logo + enlaces + interruptor no caben en
          un móvil. En vez de dejar que un icono salte solo a la segunda línea,
          la navegación baja entera y ocupa su propia fila hasta `sm`. */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link to="/" className="text-xl font-black tracking-tighter shrink-0">
          Tanke<span className="text-indigo-500">.</span>
        </Link>
        <div className="flex basis-full items-center justify-end gap-1 sm:basis-auto sm:gap-2">
          {nav}
          <DarkToggle isDark={isDark} setIsDark={setIsDark} />
        </div>
      </div>
    </header>
  );
}

export function PageShell({ title, children, loading, bare = false }) {
  useHiddenSiteFooter(bare);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
      <AppChrome />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          // Un texto suelto no dice cuánto falta ni qué va a aparecer; el
          // esqueleto reserva el sitio del título y de los paneles.
          <div role="status" className="motion-safe:animate-pulse space-y-4">
            <span className="sr-only">Cargando…</span>
            <div className="h-10 w-56 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <div className="h-28 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          </div>
        ) : (
          <>
            {title && (
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
                {title}
              </h1>
            )}
            {children}
          </>
        )}
      </main>
    </div>
  );
}

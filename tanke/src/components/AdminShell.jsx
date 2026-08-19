import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ADMIN_SECTIONS } from "../data/adminSections";
import { useHiddenSiteFooter } from "../hooks/useHiddenSiteFooter";
import { useTheme } from "../hooks/useTheme";
import { HouseIcon, SignOutIcon } from "../icons";
import { DarkToggle } from "./DarkToggle";

function NavItem({ section, active, badge, onSelect }) {
  const { icon: Icon, label } = section;
  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
        active
          ? "bg-indigo-600 text-white shadow-[0_10px_24px_-12px_rgb(79_70_229/0.9)]"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 py-0.5 text-[11px] font-black tabular-nums ${
            active ? "bg-white/25 text-white" : "bg-amber-400 text-amber-950"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function AdminShell({ current, onSelect, badges = {}, children }) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useTheme();
  useHiddenSiteFooter();
  const section =
    ADMIN_SECTIONS.find((item) => item.id === current) || ADMIN_SECTIONS[0];

  const nav = (
    <nav aria-label="Secciones del panel" className="space-y-1">
      {ADMIN_SECTIONS.map((item) => (
        <NavItem
          key={item.id}
          section={item}
          active={item.id === section.id}
          badge={badges[item.id] || 0}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* En escritorio el menú es una columna fija: el panel tiene cinco
          secciones y con pestañas se perdía de vista al bajar en las tablas. */}
      <aside className="hidden lg:flex sticky top-0 h-screen flex-col gap-6 bg-slate-900 px-4 py-6">
        <div className="flex items-center justify-between gap-2 px-2">
          <Link
            to="/"
            className="inline-flex items-baseline text-xl font-black tracking-tighter text-white"
          >
            Tanke<span className="text-indigo-400">.</span>
          </Link>
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-200">
            Panel
          </span>
        </div>

        {nav}

        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-bold text-white">
            {user?.name}
          </p>
          <p className="truncate px-3 pb-2 text-xs font-medium text-indigo-200/70">
            {user?.email}
          </p>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HouseIcon className="h-4 w-4 shrink-0" />
            Ver el sitio
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <SignOutIcon className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="bg-slate-900 px-4 py-4 lg:hidden">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-baseline text-lg font-black tracking-tighter text-white"
            >
              Tanke<span className="text-indigo-400">.</span>
              <span className="ml-2 text-xs font-bold uppercase tracking-wide text-indigo-200">
                Panel
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <DarkToggle isDark={isDark} setIsDark={setIsDark} />
              <button
                type="button"
                onClick={logout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
              >
                <SignOutIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ADMIN_SECTIONS.map((item) => (
              <NavItem
                key={item.id}
                section={item}
                active={item.id === section.id}
                badge={badges[item.id] || 0}
                onSelect={onSelect}
              />
            ))}
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:px-10 lg:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight lg:text-3xl">
                {section.title}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {section.description}
              </p>
            </div>
            <div className="hidden lg:block">
              <DarkToggle isDark={isDark} setIsDark={setIsDark} />
            </div>
          </div>
        </div>

        <main className="px-4 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

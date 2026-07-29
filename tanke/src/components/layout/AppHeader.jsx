import { Fuel, Moon, Sun } from "lucide-react";
import { IconButton } from "../ui/IconButton";

export function AppHeader({ isDark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand text-white">
            <Fuel className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-black tracking-tight text-[var(--app-ink)]">
            Tanke<span className="text-brand">.</span>
          </span>
        </a>
        <p className="hidden text-sm font-medium text-[var(--app-muted)] md:block">
          Precios oficiales · actualizados por estaciones
        </p>
        <IconButton
          label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={onToggleTheme}
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Moon className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </IconButton>
      </div>
    </header>
  );
}

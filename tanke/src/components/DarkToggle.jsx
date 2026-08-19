import { MoonIcon, SunIcon } from "../icons";

export function DarkToggle({ isDark, setIsDark, className = "" }) {
  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`relative w-16 h-9 p-1 flex items-center bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-md rounded-full transition-colors border border-white/20 shadow-xl cursor-pointer ${className}`}
    >
      <span
        className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-indigo-600 shadow-md transition-transform duration-200 ease-out motion-reduce:transition-none ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      />
      <span
        className={`relative z-10 flex-1 flex items-center justify-center transition-colors ${
          isDark ? "text-white/40" : "text-white"
        }`}
      >
        <SunIcon className="w-4 h-4" />
      </span>
      <span
        className={`relative z-10 flex-1 flex items-center justify-center transition-colors ${
          isDark ? "text-white" : "text-white/40"
        }`}
      >
        <MoonIcon className="w-4 h-4" />
      </span>
    </button>
  );
}

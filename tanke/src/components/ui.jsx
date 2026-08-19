import { useState } from "react";
import { EyeIcon, EyeSlashIcon, WarningIcon } from "../icons";

// Un solo sitio decide el aspecto de un control. Tamaño y ancho se piden por
// prop en vez de pisando clases: dos utilidades de Tailwind en conflicto
// (`h-10` sobre `h-12`) no se resuelven por el orden en que se escriben.
const fieldBase =
  "rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 placeholder:font-medium placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-colors focus-visible:border-indigo-500";

const FIELD_SIZES = { md: "h-12 px-4", sm: "h-10 px-3 text-sm" };
const FIELD_WIDTHS = { full: "w-full", auto: "w-auto" };

function fieldClass({ size = "md", width = "full", className = "" }) {
  return `${fieldBase} ${FIELD_SIZES[size]} ${FIELD_WIDTHS[width]} ${className}`;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint && (
        <span className="mt-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput({ size, width, className, ...props }) {
  return <input {...props} className={fieldClass({ size, width, className })} />;
}

export function SelectInput({ size, width, className, ...props }) {
  return (
    <select {...props} className={fieldClass({ size, width, className })} />
  );
}

export function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={fieldClass({ className: `pr-12 ${className}` })}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 cursor-pointer"
      >
        {visible ? (
          <EyeSlashIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </span>
  );
}

export function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`${fieldBase} w-full px-4 py-3 leading-relaxed ${className}`}
    />
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-bold transition-colors hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-lg font-black">{title}</p>
      <div className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const tone =
    status === "pending"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      : status === "reviewed"
        ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const label =
    status === "pending"
      ? "Pendiente"
      : status === "reviewed"
        ? "Revisado"
        : status === "dismissed"
          ? "Descartado"
          : status;
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export function AlertBox({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
    >
      <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

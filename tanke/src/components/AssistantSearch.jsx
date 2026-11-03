import { useEffect, useState } from "react";
import { api } from "../api/client";
import { SearchIcon, XIcon } from "../icons";

// Ejemplos que rotan en el placeholder: enseñan qué se puede pedir sin un
// texto de ayuda aparte.
const EXAMPLES = [
  "diésel barato en Telde",
  "gasolina 98 cerca de mí a 10 km",
  "Repsol en Las Palmas de Gran Canaria",
  "GLP en Mallorca",
];

/**
 * Búsqueda en lenguaje natural. El servidor (Claude) devuelve los filtros y
 * `onApply` los pone en el buscador: no hay una segunda lista de resultados.
 * Solo aparece si el servidor tiene clave de Anthropic (`/api/meta`).
 */
export function AssistantSearch({ currentProvince, onApply }) {
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [example, setExample] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .meta()
      .then((meta) => alive && setEnabled(Boolean(meta.assistant)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 4000);
    return () => clearInterval(timer);
  }, [enabled]);

  if (!enabled) return null;

  const submit = async (e) => {
    e.preventDefault();
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    setReply("");
    try {
      const result = await api.assistantSearch({ query: text, province: currentProvince });
      setReply(result.reply || "");
      if (result.filters) await onApply(result.filters);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const notice = error || reply;

  return (
    <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            placeholder={`Pide lo que buscas: «${EXAMPLES[example]}»`}
            aria-label="Describe la gasolinera que buscas"
            className="w-full h-12 px-4 pl-10 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 dark:text-indigo-400 pointer-events-none">
            <SearchIcon className="w-4 h-4 shrink-0" />
          </span>
        </div>
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="shrink-0 h-12 px-4 md:px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:hover:bg-indigo-600 text-white text-sm font-bold transition-colors cursor-pointer disabled:cursor-default"
        >
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {notice && (
        <div
          role={error ? "alert" : "status"}
          className={`mt-3 flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm ${
            error
              ? "border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
              : "border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200"
          }`}
        >
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => {
              setReply("");
              setError("");
            }}
            aria-label="Cerrar aviso"
            className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Lo interpreta una IA (Claude) y rellena los filtros de abajo; revísalos si algo no cuadra.
      </p>
    </div>
  );
}

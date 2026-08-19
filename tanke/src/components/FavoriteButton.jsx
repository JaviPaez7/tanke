import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { HeartFillIcon, HeartIcon } from "../icons";

export function FavoriteButton({ station }) {
  const { user, favoriteIds, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const saved = favoriteIds.has(String(station.id));

  async function onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate("/login?next=/");
      return;
    }
    setBusy(true);
    try {
      await toggleFavorite(station);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={
        saved ? "Quitar de favoritas" : "Guardar gasolinera en favoritas"
      }
      title={
        user
          ? saved
            ? "Quitar de favoritas"
            : "Guardar en mi cuenta"
          : "Inicia sesión para guardar"
      }
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
        saved
          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600"
          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500"
      }`}
    >
      {saved ? (
        <HeartFillIcon className="w-4 h-4" />
      ) : (
        <HeartIcon className="w-4 h-4" />
      )}
    </button>
  );
}

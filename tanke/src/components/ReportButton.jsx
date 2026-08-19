import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { WarningIcon } from "../icons";

export function ReportButton({ station }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const q = new URLSearchParams({
          tab: "avisos",
          estacion: String(station.id),
          nombre: station.name || "",
        });
        navigate(`/cuenta?${q}`);
      }}
      aria-label="Avisar un error en esta estación"
      title="Avisar un error"
      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-600 cursor-pointer"
    >
      <WarningIcon className="w-4 h-4" />
    </button>
  );
}

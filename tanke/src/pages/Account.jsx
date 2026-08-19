import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PageShell } from "../components/AppChrome";
import { PriceHistory } from "../components/PriceHistory";
import {
  AlertBox,
  EmptyState,
  Field,
  GhostButton,
  PrimaryButton,
  SelectInput,
  StatusPill,
  TextArea,
  TextInput,
} from "../components/ui";
import { FUELS, fuelLabel } from "../data/fuels";
import { formatPrice } from "../lib/format";

const TABS = [
  { id: "favoritas", label: "Favoritas" },
  { id: "alertas", label: "Alertas" },
  { id: "avisos", label: "Avisos" },
  { id: "historico", label: "Histórico" },
];

export default function Account() {
  const { user, ready, logout, toggleFavorite } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "favoritas";

  const [favorites, setFavorites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState({ provinces: [], fuels: FUELS });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyName, setHistoryName] = useState("");
  const [provinceId, setProvinceId] = useState("35");
  const [provincePoints, setProvincePoints] = useState([]);

  const [alertForm, setAlertForm] = useState({
    provinceId: "35",
    province: "Las Palmas",
    municipality: "",
    fuel: "price95",
    threshold: "1,20",
  });
  const estacion = params.get("estacion") || "";
  const nombre = params.get("nombre") || "";
  const [reportForm, setReportForm] = useState({
    stationId: "",
    stationName: "",
    type: "precio",
    message: "",
  });
  const reportStationId = reportForm.stationId || estacion;
  const reportStationName = reportForm.stationName || nombre;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.favorites(),
      api.alertStatus().catch(() => api.alerts()),
      api.reports(),
      api.meta(),
    ])
      .then(([fav, al, rep, m]) => {
        setFavorites(fav.favorites);
        setAlerts(al.alerts);
        setReports(rep.reports);
        setMeta(m);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (tab !== "historico") return;
    api
      .provinceHistory(provinceId)
      .then((data) => setProvincePoints(data.points))
      .catch(() => setProvincePoints([]));
  }, [tab, provinceId]);

  const triggered = useMemo(() => alerts.filter((a) => a.triggered), [alerts]);

  if (!ready) return <PageShell loading />;
  if (!user) return <Navigate to="/login?next=/cuenta" replace />;

  function setTab(id) {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  }

  async function refreshAlerts() {
    const data = await api.alertStatus().catch(() => api.alerts());
    setAlerts(data.alerts);
  }

  async function addAlert(event) {
    event.preventDefault();
    setError("");
    try {
      await api.addAlert({
        ...alertForm,
        threshold: Number(String(alertForm.threshold).replace(",", ".")),
      });
      await refreshAlerts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addReport(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api.addReport({
        ...reportForm,
        stationId: reportStationId || reportStationName,
        stationName: reportStationName,
      });
      setReports((prev) => [data.report, ...prev]);
      setReportForm({ stationId: "", stationName: "", type: "precio", message: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadHistory(fav) {
    setHistoryName(fav.stationName);
    const data = await api.stationHistory(fav.stationId);
    setHistory(data.snapshots);
  }

  function alertFromFavorite(fav) {
    const province = meta.provinces.find(
      (p) =>
        p.name.toLowerCase() === String(fav.province || "").toLowerCase() ||
        p.label.toLowerCase() === String(fav.province || "").toLowerCase(),
    );
    setAlertForm({
      provinceId: province?.id || "35",
      province: province?.name || "Las Palmas",
      municipality: fav.municipality || "",
      fuel: "price95",
      threshold: fav.latest?.price95
        ? String(fav.latest.price95).replace(".", ",")
        : "1,20",
    });
    setTab("alertas");
  }

  function reportFromFavorite(fav) {
    setReportForm({
      stationId: fav.stationId,
      stationName: fav.stationName,
      type: "precio",
      message: "",
    });
    setTab("avisos");
  }

  return (
    <PageShell title={`Hola, ${user.name}`} bare>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
          {user.email}
        </p>
        <GhostButton type="button" onClick={() => logout()}>
          Cerrar sesión
        </GhostButton>
      </div>

      {triggered.length > 0 && (
        <div className="mb-6 rounded-2xl bg-green-50 dark:bg-green-950/30 p-4">
          <p className="font-black text-green-800 dark:text-green-300">
            Hoy puedes llenar más barato
          </p>
          <ul className="mt-2 text-sm text-green-900 dark:text-green-200 space-y-1">
            {triggered.map((alert) => (
              <li key={alert.id}>
                {fuelLabel(alert.fuel)} en {alert.municipality || alert.province}:{" "}
                <span className="font-bold tabular-nums">
                  {formatPrice(alert.currentMin)}
                </span>{" "}
                (tu tope {formatPrice(alert.threshold)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`h-10 px-4 rounded-xl text-sm font-bold cursor-pointer ${
              tab === item.id
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-slate-900"
            }`}
          >
            {item.label}
            {item.id === "alertas" && triggered.length > 0
              ? ` (${triggered.length})`
              : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <AlertBox>{error}</AlertBox>
        </div>
      )}

      {loading && (
        <p className="text-slate-600 dark:text-slate-300">Actualizando tu cuenta…</p>
      )}

      {!loading && tab === "favoritas" && (
        <section className="grid gap-3">
          {favorites.length === 0 && (
            <EmptyState title="Ninguna gasolinera guardada">
              <Link to="/" className="font-bold text-indigo-600">
                Vuelve al buscador
              </Link>{" "}
              y pulsa el corazón. Se quedan en tu cuenta, no en este móvil.
            </EmptyState>
          )}
          {favorites.map((fav) => (
            <article
              key={fav.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-black truncate">{fav.stationName}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                    {fav.address} · {fav.municipality}
                  </p>
                </div>
                {fav.latest && (
                  <p className="text-right tabular-nums">
                    <span className="block text-lg font-black">
                      {formatPrice(fav.latest.price95)}
                    </span>
                    <span className="text-xs text-slate-500">G95 último cierre</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <GhostButton type="button" onClick={() => loadHistory(fav)}>
                  Histórico
                </GhostButton>
                <GhostButton type="button" onClick={() => alertFromFavorite(fav)}>
                  Crear alerta
                </GhostButton>
                <GhostButton type="button" onClick={() => reportFromFavorite(fav)}>
                  Avisar error
                </GhostButton>
                <GhostButton
                  type="button"
                  onClick={async () => {
                    await toggleFavorite({ id: fav.stationId });
                    setFavorites((prev) =>
                      prev.filter((row) => row.stationId !== fav.stationId),
                    );
                  }}
                >
                  Quitar
                </GhostButton>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${fav.lat},${fav.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-10 px-3 rounded-xl bg-indigo-600 text-white text-sm font-bold"
                >
                  Cómo llegar
                </a>
              </div>
            </article>
          ))}
          {historyName && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5">
              <PriceHistory points={history} caption={historyName} />
            </div>
          )}
        </section>
      )}

      {!loading && tab === "alertas" && (
        <section className="grid md:grid-cols-2 gap-6">
          <form
            onSubmit={addAlert}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3"
          >
            <h2 className="font-black">Nueva alerta</h2>
            <Field label="Provincia">
              <SelectInput
                value={alertForm.provinceId}
                onChange={(e) => {
                  const province = meta.provinces.find((p) => p.id === e.target.value);
                  setAlertForm((f) => ({
                    ...f,
                    provinceId: e.target.value,
                    province: province?.name || f.province,
                  }));
                }}
              >
                {meta.provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Municipio (opcional)">
              <TextInput
                value={alertForm.municipality}
                onChange={(e) =>
                  setAlertForm((f) => ({ ...f, municipality: e.target.value }))
                }
                placeholder="Telde, La Laguna…"
              />
            </Field>
            <Field label="Combustible">
              <SelectInput
                value={alertForm.fuel}
                onChange={(e) =>
                  setAlertForm((f) => ({ ...f, fuel: e.target.value }))
                }
              >
                {FUELS.map((fuel) => (
                  <option key={fuel.id} value={fuel.id}>
                    {fuel.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Avisarme por debajo de (€/L)">
              <TextInput
                inputMode="decimal"
                value={alertForm.threshold}
                onChange={(e) =>
                  setAlertForm((f) => ({ ...f, threshold: e.target.value }))
                }
                className="tabular-nums"
              />
            </Field>
            <PrimaryButton type="submit" className="w-full">
              Crear alerta
            </PrimaryButton>
          </form>
          <div className="space-y-3">
            {alerts.length === 0 && (
              <EmptyState title="Sin alertas todavía">
                Pon un umbral un par de céntimos por debajo de la media de tu
                zona. Si parte de una favorita, el municipio ya viene relleno.
              </EmptyState>
            )}
            {alerts.map((alert) => (
              <article
                key={alert.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4"
              >
                <p className="font-black">
                  {fuelLabel(alert.fuel)} ≤ {formatPrice(alert.threshold)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {alert.municipality || alert.province}
                  {alert.currentMin != null &&
                    ` · ahora ${formatPrice(alert.currentMin)}`}
                  {!alert.active && " · pausada"}
                </p>
                <div className="flex gap-2 mt-3">
                  <GhostButton
                    type="button"
                    onClick={async () => {
                      await api.patchAlert(alert.id, { active: !alert.active });
                      await refreshAlerts();
                    }}
                  >
                    {alert.active ? "Pausar" : "Activar"}
                  </GhostButton>
                  <GhostButton
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      await api.removeAlert(alert.id);
                      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                    }}
                  >
                    Eliminar
                  </GhostButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "avisos" && (
        <section className="grid md:grid-cols-2 gap-6">
          <form
            onSubmit={addReport}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-3"
          >
            <h2 className="font-black">Avisar un error</h2>
            {favorites.length > 0 && (
              <Field label="Desde una favorita">
                <SelectInput
                  value={reportStationId}
                  onChange={(e) => {
                    const fav = favorites.find((f) => f.stationId === e.target.value);
                    setReportForm((f) => ({
                      ...f,
                      stationId: e.target.value,
                      stationName: fav?.stationName || f.stationName,
                    }));
                  }}
                >
                  <option value="">Elige o escribe abajo</option>
                  {favorites.map((fav) => (
                    <option key={fav.id} value={fav.stationId}>
                      {fav.stationName} · {fav.municipality}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            <Field label="Nombre de la estación">
              <TextInput
                value={reportStationName}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, stationName: e.target.value }))
                }
              />
            </Field>
            <Field label="Tipo">
              <SelectInput
                value={reportForm.type}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option value="horario">Horario incorrecto</option>
                <option value="cerrada">Estación cerrada</option>
                <option value="precio">Precio sospechoso</option>
                <option value="otro">Otro</option>
              </SelectInput>
            </Field>
            <Field label="Qué has visto">
              <TextArea
                required
                minLength={8}
                rows={4}
                value={reportForm.message}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, message: e.target.value }))
                }
              />
            </Field>
            <input type="hidden" value={reportForm.stationId} readOnly />
            <PrimaryButton type="submit" className="w-full">
              Enviar aviso
            </PrimaryButton>
          </form>
          <ul className="space-y-3">
            {reports.length === 0 && (
              <EmptyState title="Ningún aviso enviado">
                Si una estación está cerrada o el precio no cuadra, lo revisamos
                desde el panel.
              </EmptyState>
            )}
            {reports.map((report) => (
              <li
                key={report.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black truncate">{report.stationName}</p>
                  <StatusPill status={report.status} />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {report.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "historico" && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="font-black">Media diaria en Canarias</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Solo en tu cuenta. Se guarda cada noche para Las Palmas y
                Tenerife.
              </p>
            </div>
            <SelectInput
              value={provinceId}
              onChange={(e) => setProvinceId(e.target.value)}
              width="auto"
            >
              <option value="35">Las Palmas</option>
              <option value="38">Santa Cruz de Tenerife</option>
            </SelectInput>
          </div>
          <PriceHistory points={provincePoints} />
        </section>
      )}
    </PageShell>
  );
}

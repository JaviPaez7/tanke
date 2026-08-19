import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AdminShell } from "../components/AdminShell";
import { PageShell } from "../components/AppChrome";
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
import { ADMIN_SECTIONS } from "../data/adminSections";
import { SyncIcon } from "../icons";
import {
  formatDate,
  plural,
  REPORT_STATUS,
  REPORT_TYPES,
} from "../lib/format";

const emptyArticle = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  published: false,
  categoryId: "",
  tags: "",
};

const SECTION_IDS = ADMIN_SECTIONS.map((s) => s.id);

function Panel({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {title && (
        <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export default function Admin() {
  const { user, ready } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("seccion");
  const section = SECTION_IDS.includes(requested) ? requested : "overview";
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [runs, setRuns] = useState([]);
  const [snapshots, setSnapshots] = useState(0);
  const [form, setForm] = useState(emptyArticle);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    reload();
  }, [user]);

  async function reload() {
    try {
      const [u, a, t, r, i] = await Promise.all([
        api.adminUsers(),
        api.adminArticles(),
        api.adminTaxonomy(),
        api.adminReports(),
        api.ingestion(),
      ]);
      setUsers(u.users);
      setArticles(a.articles);
      setCategories(t.categories);
      setReports(r.reports);
      setRuns(i.runs);
      setSnapshots(i.snapshots);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!ready) return <PageShell loading />;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (user.role !== "admin") {
    return (
      <PageShell title="Esta zona es privada">
        <EmptyState title="No tienes permisos de administración">
          Tu cuenta funciona con normalidad en el resto del sitio. Si necesitas
          acceso al panel, pídeselo a quien lo administra.
        </EmptyState>
      </PageShell>
    );
  }

  function goTo(id) {
    setParams(id === "overview" ? {} : { seccion: id }, { replace: true });
  }

  async function saveArticle(event) {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      categoryId: form.categoryId || null,
    };
    try {
      if (editing) await api.patchArticle(editing, payload);
      else await api.createArticle(payload);
      setForm(emptyArticle);
      setEditing(null);
      const data = await api.adminArticles();
      setArticles(data.articles);
    } catch (err) {
      setError(err.message);
    }
  }

  const pending = reports.filter((r) => r.status === "pending");
  const drafts = articles.filter((a) => !a.published);
  const lastRun = runs[0];
  const filteredUsers = users.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell
      current={section}
      onSelect={goTo}
      badges={{ reports: pending.length, articles: drafts.length }}
    >
      {error && (
        <div className="mb-6">
          <AlertBox>{error}</AlertBox>
        </div>
      )}

      {section === "overview" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Panel title="Esperando por ti">
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                No hay avisos pendientes.{" "}
                {drafts.length > 0
                  ? `Sí tienes ${drafts.length} ${drafts.length === 1 ? "guía en borrador" : "guías en borrador"}.`
                  : "Tampoco guías en borrador: todo está al día."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {pending.slice(0, 5).map((report) => (
                  <li key={report.id} className="px-5 py-4">
                    <p className="font-bold">{report.stationName}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {report.message}
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {report.user?.email} · {formatDate(report.createdAt)}
                    </p>
                  </li>
                ))}
                <li className="px-5 py-4">
                  <GhostButton onClick={() => goTo("reports")}>
                    Revisar {plural(pending.length, "aviso", "avisos")}
                  </GhostButton>
                </li>
              </ul>
            )}
          </Panel>

          <Panel title="Estado">
            <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {[
                ["Usuarios registrados", users.length],
                ["Cuentas activas", users.filter((u) => u.active).length],
                ["Guías publicadas", articles.length - drafts.length],
                ["Guías en borrador", drafts.length],
                ["Precios guardados", snapshots],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 px-5 py-3"
                >
                  <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd className="font-black tabular-nums">
                    {value.toLocaleString("es-ES")}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt className="text-slate-600 dark:text-slate-300">
                  Última ingesta
                </dt>
                <dd className="text-right font-bold">
                  {lastRun ? formatDate(lastRun.startedAt) : "Sin ejecutar"}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      )}

      {section === "users" && (
        <Panel>
          <div className="p-4">
            <TextInput
              type="search"
              placeholder="Buscar por nombre o email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar usuarios"
              className="max-w-sm"
            />
          </div>
          {filteredUsers.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-600 dark:text-slate-300">
              Ningún usuario coincide con «{query}».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3 font-black">Usuario</th>
                    <th className="px-5 py-3 font-black">Alta</th>
                    <th className="px-5 py-3 font-black">Actividad</th>
                    <th className="px-5 py-3 font-black">Rol</th>
                    <th className="px-5 py-3 font-black">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-3">
                        <span className="block font-bold">{row.name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {row.email}
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {row._count?.favorites ?? 0} fav ·{" "}
                        {row._count?.alerts ?? 0} avisos
                      </td>
                      <td className="px-5 py-3">
                        <SelectInput
                          value={row.role}
                          aria-label={`Rol de ${row.name}`}
                          onChange={async (e) => {
                            await api.patchUser(row.id, {
                              role: e.target.value,
                            });
                            reload();
                          }}
                          size="sm"
                          width="auto"
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                        </SelectInput>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={async () => {
                            await api.patchUser(row.id, {
                              active: !row.active,
                            });
                            reload();
                          }}
                          title={
                            row.active
                              ? "Desactivar esta cuenta"
                              : "Reactivar esta cuenta"
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-black uppercase tracking-wide transition-colors cursor-pointer ${
                            row.active
                              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-900/60"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {row.active ? "Activa" : "Desactivada"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {section === "articles" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel title={editing ? "Editar guía" : "Nueva guía"}>
            <form onSubmit={saveArticle} className="space-y-4 p-5">
              <Field label="Título">
                <TextInput
                  required
                  placeholder="Cómo ahorrar repostando por la mañana"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Slug"
                hint="Si lo dejas vacío se genera a partir del título."
              >
                <TextInput
                  placeholder="ahorrar-repostando-por-la-manana"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                />
              </Field>
              <Field label="Extracto">
                <TextInput
                  placeholder="Una frase para el listado y para Google"
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, excerpt: e.target.value }))
                  }
                />
              </Field>
              <Field label="Categoría">
                <SelectInput
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Etiquetas" hint="Sepáralas por comas.">
                <TextInput
                  placeholder="canarias, diésel, ahorro"
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cuerpo" hint="Un párrafo por línea en blanco.">
                <TextArea
                  required
                  rows={10}
                  value={form.body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2.5 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, published: e.target.checked }))
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                Publicada y visible en /guias
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <PrimaryButton type="submit">
                  {editing ? "Guardar cambios" : "Crear guía"}
                </PrimaryButton>
                {editing && (
                  <GhostButton
                    type="button"
                    className="h-12"
                    onClick={() => {
                      setEditing(null);
                      setForm(emptyArticle);
                    }}
                  >
                    Cancelar
                  </GhostButton>
                )}
              </div>
            </form>
          </Panel>

          <Panel title={plural(articles.length, "guía", "guías")}>
            {articles.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                Todavía no hay guías. Crea la primera con el formulario.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {articles.map((article) => (
                  <li key={article.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{article.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          /guias/{article.slug}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                          article.published
                            ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                        }`}
                      >
                        {article.published ? "Publicada" : "Borrador"}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <GhostButton
                        onClick={() => {
                          setEditing(article.id);
                          setForm({
                            title: article.title,
                            slug: article.slug,
                            excerpt: article.excerpt,
                            body: article.body,
                            published: article.published,
                            categoryId: article.categoryId || "",
                            tags: (article.tags || [])
                              .map((t) => t.name)
                              .join(", "),
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Editar
                      </GhostButton>
                      <GhostButton
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `¿Borrar «${article.title}»? No se puede deshacer.`,
                            )
                          )
                            return;
                          await api.deleteArticle(article.id);
                          setArticles((prev) =>
                            prev.filter((a) => a.id !== article.id),
                          );
                        }}
                        className="bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                      >
                        Borrar
                      </GhostButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {section === "reports" && (
        <Panel
          title={`${plural(reports.length, "aviso", "avisos")} · ${pending.length} sin revisar`}
        >
          {reports.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
              Nadie ha reportado nada todavía. Los avisos llegan desde el botón
              «Avisar de un error» de cada gasolinera.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((report) => (
                <li key={report.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {report.stationName}{" "}
                        <span className="font-medium text-slate-400">
                          #{report.stationId}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        {report.message}
                      </p>
                      <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {report.user?.email} ·{" "}
                        {REPORT_TYPES[report.type] || report.type} ·{" "}
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={report.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["reviewed", "dismissed", "pending"]
                      .filter((status) => status !== report.status)
                      .map((status) => (
                        <GhostButton
                          key={status}
                          onClick={async () => {
                            await api.patchReport(report.id, { status });
                            reload();
                          }}
                        >
                          Marcar como {REPORT_STATUS[status].toLowerCase()}
                        </GhostButton>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {section === "ingestion" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Panel title="Últimas ejecuciones">
            {runs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                Todavía no se ha guardado ningún precio. Lanza la primera
                sincronización para empezar el histórico.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {runs.map((run) => (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3"
                  >
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      {new Date(run.startedAt).toLocaleString("es-ES")}
                    </span>
                    <span
                      className={`font-bold ${
                        run.ok
                          ? "text-green-700 dark:text-green-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {run.ok
                        ? `${run.stations.toLocaleString("es-ES")} estaciones`
                        : run.error || "Falló"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Sincronizar">
            <div className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Hay {snapshots.toLocaleString("es-ES")} precios guardados. Se
                ejecuta sola una vez al día para Las Palmas y Tenerife.
              </p>
              <PrimaryButton
                type="button"
                disabled={busy}
                className="w-full"
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api.runIngestion();
                    const data = await api.ingestion();
                    setRuns(data.runs);
                    setSnapshots(data.snapshots);
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <SyncIcon
                  className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`}
                />
                {busy ? "Sincronizando…" : "Sincronizar ahora"}
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}

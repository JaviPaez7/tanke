import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AdminShell } from "../components/AdminShell";
import { PageShell } from "../components/AppChrome";
import {
  AlertBox,
  EmptyState,
  Field,
  GhostButton,
  PasswordInput,
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

const emptyUser = {
  name: "",
  email: "",
  password: "",
  role: "user",
  emailVerified: false,
};

// Mismos mínimos que valida el servidor (server/lib/content.js): el navegador
// avisa antes de enviar y el servidor sigue siendo quien manda.
const TITLE_MIN = 4;
const BODY_MIN = 20;

const SECTION_IDS = ADMIN_SECTIONS.map((s) => s.id);

const dangerButton =
  "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300";

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

// Una fila de categoría o etiqueta: nombre, en cuántas guías se usa y los
// botones de renombrar/borrar. El modo edición es local a la fila.
function TaxonomyRow({ item, kind, busy, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const used = item._count?.articles ?? 0;

  async function submit(event) {
    event.preventDefault();
    const ok = await onRename(item, name.trim());
    if (ok) setEditing(false);
  }

  return (
    <li className="px-5 py-3">
      {editing ? (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <TextInput
            autoFocus
            required
            minLength={2}
            maxLength={40}
            size="sm"
            width="auto"
            aria-label={`Nuevo nombre de ${item.name}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1"
          />
          <GhostButton type="submit" disabled={busy}>
            Guardar
          </GhostButton>
          <GhostButton
            type="button"
            disabled={busy}
            onClick={() => {
              setName(item.name);
              setEditing(false);
            }}
          >
            Cancelar
          </GhostButton>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">{item.name}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              /{item.slug} · {used === 0 ? "sin usar" : `en ${plural(used, "guía", "guías")}`}
            </p>
          </div>
          <div className="flex gap-2">
            <GhostButton
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              Renombrar
            </GhostButton>
            <GhostButton
              type="button"
              disabled={busy}
              className={dangerButton}
              onClick={() => onDelete(item, kind)}
            >
              Borrar
            </GhostButton>
          </div>
        </div>
      )}
    </li>
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
  const [tags, setTags] = useState([]);
  const [reports, setReports] = useState([]);
  const [runs, setRuns] = useState([]);
  const [snapshots, setSnapshots] = useState(0);
  const [form, setForm] = useState(emptyArticle);
  const [userForm, setUserForm] = useState(emptyUser);
  const [editing, setEditing] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Qué acción está en curso (id de fila o nombre de formulario). Mientras
  // dura, su botón se desactiva: evita el doble clic y el doble envío.
  const [pending, setPending] = useState(null);

  // Carga todo el panel. Los setState van dentro del then: es lo que la regla
  // react-hooks/set-state-in-effect pide a lo que se llama desde un efecto.
  function reload() {
    return Promise.all([
      api.adminUsers(),
      api.adminArticles(),
      api.adminTaxonomy(),
      api.adminReports(),
      api.ingestion(),
    ]).then(([u, a, t, r, i]) => {
      setUsers(u.users);
      setArticles(a.articles);
      setCategories(t.categories);
      setTags(t.tags);
      setReports(r.reports);
      setRuns(i.runs);
      setSnapshots(i.snapshots);
    });
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    reload().catch((err) => setError(err.message));
  }, [user]);

  async function reloadTaxonomy() {
    const t = await api.adminTaxonomy();
    setCategories(t.categories);
    setTags(t.tags);
  }

  // Todas las acciones del panel pasan por aquí: un solo sitio decide qué
  // pasa si la petición falla (mensaje arriba) y bloquea el control mientras
  // tanto. Devuelve true si salió bien para que el llamador pueda cerrar
  // formularios o limpiar campos.
  async function run(key, action) {
    setPending(key);
    setError("");
    setNotice("");
    try {
      await action();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(null);
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
    setError("");
    setNotice("");
  }

  async function createUser(event) {
    event.preventDefault();
    const ok = await run("user-form", async () => {
      const data = await api.createUser(userForm);
      setUsers((previous) => [data.user, ...previous]);
    });
    if (ok) {
      setUserForm(emptyUser);
      setNotice("Usuario creado. Ya puede iniciar sesión.");
    }
  }

  async function saveArticle(event) {
    event.preventDefault();
    const payload = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      categoryId: form.categoryId || null,
    };
    const ok = await run("article-form", async () => {
      if (editing) await api.patchArticle(editing, payload);
      else await api.createArticle(payload);
      const data = await api.adminArticles();
      setArticles(data.articles);
      // Las etiquetas nuevas escritas en la guía aparecen en su pantalla.
      await reloadTaxonomy();
    });
    if (ok) {
      setNotice(editing ? "Guía guardada." : "Guía creada.");
      setForm(emptyArticle);
      setEditing(null);
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`¿Borrar «${article.title}»? No se puede deshacer.`)) return;
    await run(article.id, async () => {
      await api.deleteArticle(article.id);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      if (editing === article.id) {
        setEditing(null);
        setForm(emptyArticle);
      }
      await reloadTaxonomy();
    });
  }

  async function createCategory(event) {
    event.preventDefault();
    const ok = await run("category-form", async () => {
      await api.createCategory({ name: newCategory.trim() });
      await reloadTaxonomy();
    });
    if (ok) setNewCategory("");
  }

  async function renameTaxonomy(item, kind, name) {
    if (!name || name === item.name) return true;
    return run(item.id, async () => {
      if (kind === "category") await api.patchCategory(item.id, { name });
      else await api.patchTag(item.id, { name });
      await reloadTaxonomy();
      // El nombre también se ve en la lista de guías.
      const data = await api.adminArticles();
      setArticles(data.articles);
    });
  }

  async function deleteTaxonomy(item, kind) {
    const used = item._count?.articles ?? 0;
    const what = kind === "category" ? "la categoría" : "la etiqueta";
    const consequence =
      used === 0
        ? "No la usa ninguna guía."
        : kind === "category"
          ? `${plural(used, "guía se quedará", "guías se quedarán")} sin categoría.`
          : `Desaparecerá de ${plural(used, "guía", "guías")}.`;
    if (!window.confirm(`¿Borrar ${what} «${item.name}»? ${consequence}`)) return;
    const ok = await run(item.id, async () => {
      if (kind === "category") await api.deleteCategory(item.id);
      else await api.deleteTag(item.id);
      await reloadTaxonomy();
      const data = await api.adminArticles();
      setArticles(data.articles);
      if (kind === "category" && form.categoryId === item.id) {
        setForm((f) => ({ ...f, categoryId: "" }));
      }
    });
    if (ok) setNotice(`${kind === "category" ? "Categoría" : "Etiqueta"} borrada.`);
  }

  const pendingReports = reports.filter((r) => r.status === "pending");
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
      badges={{ reports: pendingReports.length, articles: drafts.length }}
    >
      {error && (
        <div className="mb-6">
          <AlertBox>{error}</AlertBox>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200"
        >
          {notice}
        </p>
      )}

      {section === "overview" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Panel title="Esperando por ti">
            {pendingReports.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                No hay avisos pendientes.{" "}
                {drafts.length > 0
                  ? `Sí tienes ${drafts.length} ${drafts.length === 1 ? "guía en borrador" : "guías en borrador"}.`
                  : "Tampoco guías en borrador: todo está al día."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingReports.slice(0, 5).map((report) => (
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
                    Revisar {plural(pendingReports.length, "aviso", "avisos")}
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
                ["Categorías", categories.length],
                ["Etiquetas", tags.length],
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
        <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Panel title="Crear usuario">
            <form onSubmit={createUser} className="space-y-4 p-5">
              <Field label="Nombre">
                <TextInput
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="off"
                  value={userForm.name}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Contraseña" hint="Entre 8 y 128 caracteres.">
                <PasswordInput
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </Field>
              <Field label="Rol">
                <SelectInput
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </SelectInput>
              </Field>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={userForm.emailVerified}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      emailVerified: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <span className="block font-bold">Email verificado</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Márcalo solo si has comprobado que la dirección pertenece a esa persona.
                  </span>
                </span>
              </label>
              <PrimaryButton
                type="submit"
                disabled={
                  pending === "user-form" ||
                  (userForm.password.length > 0 && userForm.password.length < 8)
                }
                className="w-full"
              >
                {pending === "user-form" ? "Creando…" : "Crear usuario"}
              </PrimaryButton>
              <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                La cuenta queda activa y puede iniciar sesión inmediatamente.
              </p>
            </form>
          </Panel>

          <Panel title="Usuarios registrados" className="min-w-0">
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
                    {filteredUsers.map((row) => {
                      const self = row.id === user.id;
                      const busy = pending === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-5 py-3">
                            <span className="block font-bold">
                              {row.name}
                              {self && (
                                <span className="ml-2 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  Tú
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {row.email}
                              {!row.emailVerifiedAt && (
                                <span
                                  title="Aún no ha confirmado su email: no recibe alertas"
                                  className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                >
                                  Sin verificar
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                            {formatDate(row.createdAt)}
                          </td>
                          <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                            {row._count?.favorites ?? 0} fav ·{" "}
                            {row._count?.alerts ?? 0} alertas ·{" "}
                            {row._count?.reports ?? 0} avisos
                          </td>
                          <td className="px-5 py-3">
                            <SelectInput
                              value={row.role}
                              aria-label={`Rol de ${row.name}`}
                              disabled={self || busy}
                              title={self ? "No puedes cambiar tu propio rol" : undefined}
                              onChange={(e) =>
                                run(row.id, async () => {
                                  await api.patchUser(row.id, { role: e.target.value });
                                  const data = await api.adminUsers();
                                  setUsers(data.users);
                                })
                              }
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
                              disabled={self || busy}
                              onClick={() =>
                                run(row.id, async () => {
                                  await api.patchUser(row.id, { active: !row.active });
                                  const data = await api.adminUsers();
                                  setUsers(data.users);
                                })
                              }
                              title={
                                self
                                  ? "No puedes desactivar tu propia cuenta"
                                  : row.active
                                    ? "Desactivar esta cuenta"
                                    : "Reactivar esta cuenta"
                              }
                              className={`h-9 rounded-lg px-3 text-xs font-black uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                                row.active
                                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-900/60"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              }`}
                            >
                              {busy ? "…" : row.active ? "Activa" : "Desactivada"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {section === "articles" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel title={editing ? "Editar guía" : "Nueva guía"}>
            <form onSubmit={saveArticle} className="space-y-4 p-5">
              <Field label="Título" hint={`Mínimo ${TITLE_MIN} caracteres.`}>
                <TextInput
                  required
                  minLength={TITLE_MIN}
                  maxLength={160}
                  placeholder="Cómo ahorrar repostando por la mañana"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Slug"
                hint="Es la parte final de la URL. Si lo dejas vacío se genera a partir del título."
              >
                <TextInput
                  placeholder="ahorrar-repostando-por-la-manana"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                />
              </Field>
              <Field label="Extracto" hint="Una frase para el listado y para Google.">
                <TextInput
                  maxLength={300}
                  placeholder="Qué significan la media, el ahorro y los colores"
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, excerpt: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Categoría"
                hint={
                  categories.length === 0
                    ? "Todavía no hay categorías: créalas en su pantalla."
                    : undefined
                }
              >
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
              <Field
                label="Etiquetas"
                hint="Sepáralas por comas. Las que no existan se crean solas."
              >
                <TextInput
                  placeholder="canarias, diésel, ahorro"
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Cuerpo"
                hint={`Un párrafo por línea en blanco. Mínimo ${BODY_MIN} caracteres.`}
              >
                <TextArea
                  required
                  minLength={BODY_MIN}
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
                <PrimaryButton type="submit" disabled={pending === "article-form"}>
                  {pending === "article-form"
                    ? "Guardando…"
                    : editing
                      ? "Guardar cambios"
                      : "Crear guía"}
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
                          {article.category?.name
                            ? ` · ${article.category.name}`
                            : " · sin categoría"}
                        </p>
                        {article.tags?.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {article.tags.map((tag) => (
                              <li
                                key={tag.id}
                                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide dark:bg-slate-800"
                              >
                                {tag.name}
                              </li>
                            ))}
                          </ul>
                        )}
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <GhostButton
                        type="button"
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
                      {article.published && (
                        <Link
                          to={`/guias/${article.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-bold transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          Ver
                        </Link>
                      )}
                      <GhostButton
                        type="button"
                        disabled={pending === article.id}
                        onClick={() => deleteArticle(article)}
                        className={dangerButton}
                      >
                        {pending === article.id ? "Borrando…" : "Borrar"}
                      </GhostButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {section === "taxonomy" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel title={plural(categories.length, "categoría", "categorías")}>
            <form
              onSubmit={createCategory}
              className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-5 dark:border-slate-800"
            >
              <div className="min-w-0 flex-1">
                <Field label="Nueva categoría">
                  <TextInput
                    required
                    minLength={2}
                    maxLength={40}
                    placeholder="Mantenimiento"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </Field>
              </div>
              <PrimaryButton type="submit" disabled={pending === "category-form"}>
                {pending === "category-form" ? "Creando…" : "Crear"}
              </PrimaryButton>
            </form>
            {categories.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                Sin categorías. Las guías pueden vivir sin ella, pero agrupan mejor
                el listado público.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories.map((category) => (
                  <TaxonomyRow
                    key={category.id}
                    item={category}
                    kind="category"
                    busy={pending === category.id}
                    onRename={(item, name) => renameTaxonomy(item, "category", name)}
                    onDelete={deleteTaxonomy}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={plural(tags.length, "etiqueta", "etiquetas")}>
            <p className="border-b border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
              Las etiquetas nacen al escribirlas en una guía. Aquí se renombran o
              se borran; borrar una la quita de todas las guías que la usan.
            </p>
            {tags.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                Todavía no hay etiquetas.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {tags.map((tag) => (
                  <TaxonomyRow
                    key={tag.id}
                    item={tag}
                    kind="tag"
                    busy={pending === tag.id}
                    onRename={(item, name) => renameTaxonomy(item, "tag", name)}
                    onDelete={deleteTaxonomy}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {section === "reports" && (
        <Panel
          title={`${plural(reports.length, "aviso", "avisos")} · ${pendingReports.length} sin revisar`}
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
                          type="button"
                          disabled={pending === report.id}
                          onClick={() =>
                            run(report.id, async () => {
                              await api.patchReport(report.id, { status });
                              const data = await api.adminReports();
                              setReports(data.reports);
                            })
                          }
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
                Hay {snapshots.toLocaleString("es-ES")} precios guardados. El
                servidor guarda una copia al día de las provincias configuradas
                (por defecto Las Palmas y Tenerife); aquí puedes forzarla.
              </p>
              <PrimaryButton
                type="button"
                disabled={pending === "ingestion"}
                className="w-full"
                onClick={() =>
                  run("ingestion", async () => {
                    const { run: result } = await api.runIngestion();
                    const data = await api.ingestion();
                    setRuns(data.runs);
                    setSnapshots(data.snapshots);
                    if (result && !result.ok) {
                      throw new Error(
                        result.error || "La sincronización ha fallado.",
                      );
                    }
                  })
                }
              >
                <SyncIcon
                  className={`mr-2 h-4 w-4 ${pending === "ingestion" ? "animate-spin" : ""}`}
                />
                {pending === "ingestion" ? "Sincronizando…" : "Sincronizar ahora"}
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}

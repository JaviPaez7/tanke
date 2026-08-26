import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  AlertBox,
  Field,
  GhostButton,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from "./ui";

const CONFIRM_WORD = "BORRAR";

function Panel({ title, description, children, tone = "normal" }) {
  const border =
    tone === "danger"
      ? "border-red-200 dark:border-red-900/60"
      : "border-slate-200 dark:border-slate-800";
  return (
    <section
      className={`rounded-3xl border ${border} bg-white dark:bg-slate-900 p-5`}
    >
      <h2
        className={`font-black ${
          tone === "danger" ? "text-red-700 dark:text-red-300" : ""
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Un aviso verde efimero por panel: si el resultado se pintara arriba del todo,
// quien acaba de guardar la contraseña no veria la confirmacion sin subir.
function Done({ children }) {
  if (!children) return null;
  return (
    <p className="mt-3 text-sm font-bold text-green-700 dark:text-green-300">
      {children}
    </p>
  );
}

export function AccountSettings() {
  const { user, updateUser, clearSession } = useAuth();

  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    password: "",
  });
  const [profileState, setProfileState] = useState({ busy: false, error: "", done: "" });

  const [pass, setPass] = useState({ current: "", next: "", repeat: "" });
  const [passState, setPassState] = useState({ busy: false, error: "", done: "" });

  const [danger, setDanger] = useState({ password: "", confirm: "" });
  const [dangerState, setDangerState] = useState({ busy: false, error: "", open: false });

  const emailChanged = profile.email.trim().toLowerCase() !== user.email;

  async function saveProfile(event) {
    event.preventDefault();
    setProfileState({ busy: true, error: "", done: "" });
    try {
      const data = await api.updateMe({
        name: profile.name,
        email: profile.email,
        password: profile.password,
      });
      updateUser(data.user);
      setProfile((p) => ({ ...p, password: "" }));
      setProfileState({ busy: false, error: "", done: "Datos guardados." });
    } catch (err) {
      setProfileState({ busy: false, error: err.message, done: "" });
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (pass.next !== pass.repeat) {
      setPassState({ busy: false, error: "Las dos contraseñas no coinciden.", done: "" });
      return;
    }
    setPassState({ busy: true, error: "", done: "" });
    try {
      const data = await api.changePassword({
        currentPassword: pass.current,
        newPassword: pass.next,
      });
      setPass({ current: "", next: "", repeat: "" });
      setPassState({
        busy: false,
        error: "",
        done: data.closedSessions
          ? `Contraseña cambiada. Hemos cerrado ${data.closedSessions} sesión${
              data.closedSessions === 1 ? "" : "es"
            } más en otros dispositivos.`
          : "Contraseña cambiada.",
      });
    } catch (err) {
      setPassState({ busy: false, error: err.message, done: "" });
    }
  }

  async function removeAccount(event) {
    event.preventDefault();
    setDangerState((s) => ({ ...s, busy: true, error: "" }));
    try {
      await api.deleteAccount({ password: danger.password });
      clearSession();
      // Recarga completa: la sesion ya no existe y no queda nada que repintar.
      window.location.href = "/";
    } catch (err) {
      setDangerState((s) => ({ ...s, busy: false, error: err.message }));
    }
  }

  return (
    <div className="grid gap-5">
      <Panel
        title="Tus datos"
        description="El nombre es el que ves al entrar. El email es a donde llega el enlace si olvidas la contraseña."
      >
        <form onSubmit={saveProfile} className="grid gap-4 md:max-w-md" noValidate>
          {profileState.error && <AlertBox>{profileState.error}</AlertBox>}
          <Field label="Nombre">
            <TextInput
              required
              minLength={2}
              maxLength={60}
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
          </Field>
          {emailChanged && (
            <Field
              label="Tu contraseña"
              hint="Cambiar el email pide la contraseña: es la dirección que recupera la cuenta."
            >
              <PasswordInput
                autoComplete="current-password"
                required
                value={profile.password}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, password: e.target.value }))
                }
              />
            </Field>
          )}
          <div>
            <PrimaryButton type="submit" disabled={profileState.busy}>
              {profileState.busy ? "Guardando…" : "Guardar cambios"}
            </PrimaryButton>
            <Done>{profileState.done}</Done>
          </div>
        </form>
      </Panel>

      <Panel
        title="Contraseña"
        description="Al cambiarla cerramos las sesiones abiertas en otros dispositivos, pero no esta."
      >
        <form onSubmit={savePassword} className="grid gap-4 md:max-w-md" noValidate>
          {passState.error && <AlertBox>{passState.error}</AlertBox>}
          <Field label="Contraseña actual">
            <PasswordInput
              autoComplete="current-password"
              required
              value={pass.current}
              onChange={(e) => setPass((p) => ({ ...p, current: e.target.value }))}
            />
          </Field>
          <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={8}
              value={pass.next}
              onChange={(e) => setPass((p) => ({ ...p, next: e.target.value }))}
            />
          </Field>
          <Field label="Repítela">
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={8}
              value={pass.repeat}
              onChange={(e) => setPass((p) => ({ ...p, repeat: e.target.value }))}
            />
          </Field>
          <div>
            <PrimaryButton type="submit" disabled={passState.busy}>
              {passState.busy ? "Cambiando…" : "Cambiar contraseña"}
            </PrimaryButton>
            <Done>{passState.done}</Done>
          </div>
        </form>
      </Panel>

      <Panel
        title="Descargar mis datos"
        description="Un archivo JSON con tu cuenta, tus gasolineras guardadas, tus alertas y los avisos que has enviado."
      >
        <a
          href={api.exportUrl()}
          download
          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-bold transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          Descargar JSON
        </a>
      </Panel>

      <Panel
        title="Borrar mi cuenta"
        description="Se van tus favoritas, tus alertas y tus avisos. No hay vuelta atrás ni copia que podamos restaurar."
        tone="danger"
      >
        {!dangerState.open ? (
          <GhostButton
            type="button"
            onClick={() => setDangerState((s) => ({ ...s, open: true }))}
            className="!bg-red-50 !text-red-700 hover:!bg-red-100 dark:!bg-red-950/40 dark:!text-red-300 dark:hover:!bg-red-900/40"
          >
            Quiero borrar mi cuenta
          </GhostButton>
        ) : (
          <form onSubmit={removeAccount} className="grid gap-4 md:max-w-md" noValidate>
            {dangerState.error && <AlertBox>{dangerState.error}</AlertBox>}
            <Field label="Tu contraseña">
              <PasswordInput
                autoComplete="current-password"
                required
                value={danger.password}
                onChange={(e) =>
                  setDanger((d) => ({ ...d, password: e.target.value }))
                }
              />
            </Field>
            <Field label={`Escribe ${CONFIRM_WORD} para confirmar`}>
              <TextInput
                required
                autoComplete="off"
                placeholder={CONFIRM_WORD}
                value={danger.confirm}
                onChange={(e) =>
                  setDanger((d) => ({ ...d, confirm: e.target.value }))
                }
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={dangerState.busy || danger.confirm !== CONFIRM_WORD}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-red-600 px-5 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {dangerState.busy ? "Borrando…" : "Borrar mi cuenta para siempre"}
              </button>
              <GhostButton
                type="button"
                onClick={() => {
                  setDanger({ password: "", confirm: "" });
                  setDangerState({ busy: false, error: "", open: false });
                }}
              >
                Cancelar
              </GhostButton>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}

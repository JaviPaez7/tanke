import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { GhostButton } from "./ui";

// Aviso de direccion sin confirmar (o cambio pendiente) con el boton de
// reenviar. Vive en /cuenta, encima de las pestañas: es lo primero que ve
// quien acaba de registrarse.
export function VerifyEmailNotice() {
  const { user, pendingEmail } = useAuth();
  const [state, setState] = useState({ busy: false, sentTo: "", error: "" });

  if (!user || (user.emailVerified && !pendingEmail)) return null;

  const target = pendingEmail || user.email;
  const text = pendingEmail
    ? `Tienes un cambio de email pendiente: confírmalo desde el enlace que te hemos enviado a ${target}. Hasta entonces la cuenta sigue con ${user.email}.`
    : `Confirma tu email desde el enlace que te hemos enviado a ${target}. Sin este paso no te llegarán las alertas de precio.`;

  async function resend() {
    setState({ busy: true, sentTo: "", error: "" });
    try {
      const data = await api.resendVerification();
      setState({ busy: false, sentTo: data.sentTo, error: "" });
    } catch (err) {
      setState({ busy: false, sentTo: "", error: err.message });
    }
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100 md:flex-row md:items-center md:justify-between"
    >
      <p className="leading-relaxed">
        <span className="font-bold">{text}</span>
        {state.sentTo && ` Enviado de nuevo a ${state.sentTo}.`}
        {state.error && ` ${state.error}`}
      </p>
      <GhostButton type="button" onClick={resend} disabled={state.busy} className="shrink-0">
        {state.busy ? "Enviando…" : "Reenviar correo"}
      </GhostButton>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthLayout } from "../components/AuthLayout";
import { AlertBox, Field, PrimaryButton, TextInput } from "../components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.forgot({ email });
      setSent(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Recupera tu cuenta"
      intro="Escribe el email con el que te registraste y te mandamos un enlace para elegir una contraseña nueva."
      footer={
        <p>
          ¿Te has acordado?{" "}
          <Link
            to="/login"
            className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500"
          >
            Volver a entrar
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold leading-relaxed text-green-800 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
            {sent}
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Mira también la carpeta de spam. El enlace caduca en 30 minutos y
            solo se puede usar una vez.
          </p>
          <button
            type="button"
            onClick={() => setSent("")}
            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Probar con otro email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && <AlertBox>{error}</AlertBox>}
          <Field label="Email">
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy} className="w-full">
            {busy ? "Enviando…" : "Enviarme el enlace"}
          </PrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}

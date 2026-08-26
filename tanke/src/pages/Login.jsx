import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import {
  AlertBox,
  Field,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { safeNext } from "../lib/format";

// Quien llega desde "guardar en favoritas" o desde /admin ya sabe qué quería
// hacer: el texto lo confirma en vez de darle la bienvenida en abstracto.
function introFor(next) {
  if (next.startsWith("/admin")) {
    return "El panel de administración necesita una cuenta con permisos.";
  }
  if (next.startsWith("/cuenta")) {
    return "Entra para ver tus gasolineras guardadas, tus avisos y el histórico.";
  }
  return "Entra para guardar gasolineras y recibir avisos cuando bajen de precio.";
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email, password });
      navigate(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const registerHref = `/registro${
    next !== "/cuenta" ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <AuthLayout
      title="Entra en tu cuenta"
      intro={introFor(next)}
      footer={
        <p>
          ¿Todavía no tienes cuenta?{" "}
          <Link
            to={registerHref}
            className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500"
          >
            Créala en un minuto
          </Link>
        </p>
      }
    >
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
        <Field label="Contraseña">
          <PasswordInput
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <p className="-mt-2 text-right">
          <Link
            to="/recuperar"
            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            ¿Has olvidado la contraseña?
          </Link>
        </p>
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? "Entrando…" : "Iniciar sesión"}
        </PrimaryButton>
        <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          El buscador de gasolineras funciona sin cuenta.{" "}
          <Link
            to="/"
            className="font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Volver a buscar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

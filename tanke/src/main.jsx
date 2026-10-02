import { StrictMode, Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { registerSW } from "virtual:pwa-register";

// Solo el buscador entra en el bundle inicial: es la razón por la que la gente
// llega a Tanke. La cuenta, las guías y sobre todo /admin son pantallas que la
// mayoría de visitas no abren nunca, así que viajan en sus propios chunks.
const Account = lazy(() => import("./pages/Account.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const GuideArticle = lazy(() => import("./pages/GuideArticle.jsx"));
const Guides = lazy(() => import("./pages/Guides.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));

registerSW({ immediate: true });

// Entrada suave al cambiar de página. Se valoró la View Transitions API, pero
// React Router solo la integra (`viewTransition`) en modo data router
// (createBrowserRouter), y la app usa <BrowserRouter>: migrar todas las rutas
// y su Suspense a una semana de la defensa no compensaba. Esto es CSS puro:
// la key fuerza a montar la página nueva y .page-enter la hace aparecer.
// En la primera carga no se anima: una página que nace a opacidad 0 retrasa
// el LCP que mide Lighthouse.
function RouteTransition({ children }) {
  const { pathname } = useLocation();
  const [firstPath] = useState(pathname);
  const [navigated, setNavigated] = useState(false);
  if (!navigated && pathname !== firstPath) setNavigated(true);

  return (
    <div key={pathname} className={navigated ? "page-enter" : undefined}>
      {children}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* El chunk de una ruta tarda milisegundos; un spinner que parpadea
            molesta más que un hueco quieto del color de la página. */}
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Cargando"
              className="min-h-screen bg-slate-50 dark:bg-slate-950"
            />
          }
        >
          <RouteTransition>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/recuperar" element={<ForgotPassword />} />
            <Route path="/restablecer" element={<ResetPassword />} />
            <Route path="/verificar" element={<VerifyEmail />} />
            <Route path="/cuenta" element={<Account />} />
            <Route path="/guias" element={<Guides />} />
            <Route path="/guias/:slug" element={<GuideArticle />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RouteTransition>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

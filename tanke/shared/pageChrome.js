import { createElement as h } from "react";
import { ICON_PATHS } from "./iconPaths.js";

// Sin estado ni APIs del navegador: React y Express usan estas mismas piezas.
export function Brand({ linkComponent = "a" }) {
  return h(linkComponent, {
    ...(linkComponent === "a" ? { href: "/" } : { to: "/" }),
    className: "site-brand", "aria-label": "Tanke, inicio",
  }, "Tanke", h("span", null, "."));
}

function icon(name) {
  return h("svg", { viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": true, focusable: false },
    h("path", { d: ICON_PATHS[name] }));
}

export function ThemeSwitch({ isDark = false, onClick, serverControlled = false, className = "" }) {
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return h("button", {
    type: "button", role: "switch", "aria-checked": isDark, "aria-label": label, title: label,
    ...(serverControlled ? { "data-theme-toggle": "" } : {}),
    onClick, className: `theme-switch ${className}`,
  }, h("span", { className: "theme-switch__thumb" }),
  h("span", { className: "theme-switch__sun" }, icon("sun")),
  h("span", { className: "theme-switch__moon" }, icon("moon")));
}

export function InteriorHeader({ navigation, themeControl, brandLink }) {
  return h("header", { className: "interior-header" },
    h("div", { className: "interior-header__inner" },
      brandLink || h(Brand), h("div", { className: "interior-header__actions" }, navigation, themeControl)));
}

export function PageHero({ eyebrow, title, lead, actions = [], breadcrumbs = [], metadata, linkComponent = "a" }) {
  const link = (href, props, children) => h(linkComponent, {
    ...(linkComponent === "a" ? { href } : { to: href }), ...props,
  }, children);
  return h("section", { className: "page-hero" },
    h("div", { className: "page-hero__content" },
      breadcrumbs.length > 0 && h("nav", { "aria-label": "Ruta de navegación", className: "page-breadcrumbs" },
        h("ol", null, breadcrumbs.map((crumb, i) => h("li", { key: `${i}-${crumb.label}` },
          i > 0 && h("span", { "aria-hidden": true, className: "page-breadcrumbs__separator" }, "/"),
          crumb.href ? link(crumb.href, {}, crumb.label) : h("span", { "aria-current": "page" }, crumb.label))))),
      eyebrow && h("p", { className: "page-hero__eyebrow" }, eyebrow),
      h("h1", { className: "page-hero__title" }, title),
      lead && h("p", { className: "page-hero__lead" }, lead),
      metadata && h("div", { className: "page-hero__metadata" }, metadata),
      actions.length > 0 && h("div", { className: "page-hero__actions" }, actions.map(({ href, label, ghost }) =>
        link(href, { key: href, className: ghost ? "page-button page-button--hero-secondary" : "page-button page-button--hero" }, label)))));
}

const footerGroups = [
  { title: "Canarias", links: [
    ["/gasolineras/las-palmas", "Las Palmas / Gran Canaria"],
    ["/gasolineras/santa-cruz-de-tenerife", "Santa Cruz de Tenerife"],
  ] },
  { title: "Península", links: [
    ["/gasolineras/madrid", "Madrid"], ["/gasolineras/barcelona", "Barcelona"],
    ["/gasolineras/valencia", "Valencia"], ["/gasolineras/sevilla", "Sevilla"],
  ] },
  { title: "Precios y guías", links: [
    ["/precios/gasolina-95", "Gasolina 95"], ["/precios/gasolina-98", "Gasolina 98"],
    ["/precios/diesel", "Diésel"], ["/precios/glp", "GLP / Autogas"],
    ["/guias", "Todas las guías"], ["/guia/ahorrar-gasolina", "Cómo ahorrar gasolina"],
  ] },
];

export function SiteFooter() {
  return h("footer", { className: "site-footer" },
    h("div", { className: "site-footer__inner" },
      h("div", { className: "site-footer__main" },
        h("div", { className: "site-footer__intro" }, h(Brand),
          h("p", { className: "mt-4 font-bold text-slate-800 dark:text-slate-200" }, "Reposta con mejores decisiones."),
          h("p", { className: "mt-2" }, "Compara las gasolineras más baratas de España con precios oficiales del Ministerio. Elige provincia, combustible y litros de tu depósito para encontrar el ahorro que te compensa.")),
        h("nav", { className: "site-footer__cols", "aria-label": "Precios por provincia y combustible" },
          footerGroups.map(({ title, links }) => h("div", { key: title }, h("h2", null, title),
            h("ul", null, links.map(([href, label]) => h("li", { key: href }, h("a", { href }, label)))))))),
      h("div", { className: "site-footer__legal" },
        h("p", null, "Datos orientativos del Ministerio para la Transición Ecológica y el Reto Demográfico. Confirma siempre el precio en la estación."),
        h("a", { href: "https://javistudio.dev" }, "Hecho por JaviStudio"))));
}

// Los botones de Express llevan data-theme-toggle; los de React usan su hook.
export const THEME_SCRIPT = `<script>
(function () {
  function apply(dark) {
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      var label = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
      button.setAttribute("aria-checked", String(dark));
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }
  var dark = false;
  try { dark = localStorage.getItem("tanke_dark") === "true"; } catch (e) {}
  apply(dark);
  document.addEventListener("DOMContentLoaded", function () {
    apply(document.documentElement.classList.contains("dark"));
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest || !event.target.closest("[data-theme-toggle]")) return;
    var dark = !document.documentElement.classList.contains("dark");
    apply(dark);
    try { localStorage.setItem("tanke_dark", String(dark)); } catch (e) {}
  });
})();
</script>`;

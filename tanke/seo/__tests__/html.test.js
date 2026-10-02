import { afterEach, describe, expect, it } from "vitest";
import { inlineScriptHashes } from "../../server/lib/csp.js";
import {
  THEME_SCRIPT,
  renderFuelLanding,
  renderGuidePage,
  renderNotFoundPage,
  renderProvinceLanding,
  setAppStylesheet,
  stylesheetFromShell,
} from "../html.js";
import { fuelPages } from "../provinces.js";

const station = {
  id: "1",
  name: "Gasolinera <Prueba>",
  address: "Calle Mayor 1",
  municipality: "Telde",
  price95: 1.389,
  priceDiesel: 1.549,
  lat: 27.99,
  lng: -15.41,
};

function province(overrides = {}) {
  return renderProvinceLanding({
    provinceKey: "Las Palmas",
    stations: [station],
    avg95: 1.4,
    avgDiesel: 1.55,
    top95: [station],
    topDiesel: [station],
    ...overrides,
  });
}

afterEach(() => setAppStylesheet(null));

describe("landings SEO con el diseño de la app", () => {
  it("encuentra la hoja de estilos en el index.html construido", () => {
    const shell =
      '<head><link rel="stylesheet" crossorigin href="/assets/index-D2qq.css"></head>';
    expect(stylesheetFromShell(shell)).toBe("/assets/index-D2qq.css");
    expect(stylesheetFromShell("<head></head>")).toBeNull();
  });

  it("todas las páginas enlazan el CSS de la app y aplican el tema", () => {
    setAppStylesheet("/assets/index-D2qq.css");
    const pages = [
      province(),
      renderFuelLanding(fuelPages[0]),
      renderGuidePage(),
      renderNotFoundPage(),
    ];
    for (const html of pages) {
      expect(html).toContain('<link rel="stylesheet" href="/assets/index-D2qq.css" />');
      expect(html).toContain(THEME_SCRIPT);
      expect(html).not.toContain("<style>");
    }
  });

  it("sin build no enlaza ninguna hoja, pero el contenido sigue ahí", () => {
    const html = province();
    expect(html).not.toContain('rel="stylesheet"');
    expect(html).toContain("Gasolineras más baratas en Las Palmas");
  });

  it("pinta las estaciones como tarjetas, escapadas y con Cómo llegar", () => {
    const html = province();
    expect(html).toContain("Gasolinera &lt;Prueba&gt;");
    expect(html).not.toContain("<Prueba>");
    expect(html).toContain(
      "https://www.google.com/maps/dir/?api=1&amp;destination=27.99,-15.41",
    );
    expect(html).not.toContain("<table");
  });

  it("mantiene canonical, robots y JSON-LD", () => {
    const html = province();
    expect(html).toContain(
      '<link rel="canonical" href="https://tanke.javistudio.dev/gasolineras/las-palmas" />',
    );
    expect(html).toContain('content="index,follow,max-image-preview:large"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(renderNotFoundPage()).toContain('<meta name="robots" content="noindex" />');
  });

  it("el script de tema es el único inline ejecutable: su hash basta en la CSP", () => {
    expect(inlineScriptHashes(province())).toEqual(inlineScriptHashes(THEME_SCRIPT));
  });
});

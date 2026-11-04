import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { THEME_SCRIPT } from "../pageChrome.js";

function page({ saved = null, storageBlocked = false } = {}) {
  const classes = new Set();
  const attributes = {};
  const handlers = {};
  const button = { setAttribute: (key, value) => { attributes[key] = value; } };
  let controls = [];
  let stored = saved;
  runInNewContext(THEME_SCRIPT.slice(8, -9), {
    document: {
      documentElement: { classList: {
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        contains: (name) => classes.has(name),
      } },
      querySelectorAll: () => controls,
      addEventListener: (name, handler) => { handlers[name] = handler; },
    },
    localStorage: {
      getItem: () => { if (storageBlocked) throw new Error("Blocked"); return stored; },
      setItem: (_key, value) => { if (storageBlocked) throw new Error("Blocked"); stored = value; },
    },
  });
  // El script está en head: el botón del servidor aparece después.
  controls = [button];
  handlers.DOMContentLoaded();
  return { classes, attributes, button, stored: () => stored,
    click: (controlled = true) => handlers.click({ target: { closest: () => controlled ? button : null } }),
  };
}

describe("tema compartido con las páginas del servidor", () => {
  it("aplica la preferencia guardada antes de pintar y sincroniza el botón", () => {
    const p = page({ saved: "true" });
    expect([...p.classes]).toEqual(["dark"]);
    expect(p.attributes).toMatchObject({ "aria-checked": "true", "aria-label": "Cambiar a modo claro" });
    expect(p.button.title).toBe("Cambiar a modo claro");
  });

  it("cambia el tema y conserva la preferencia entre páginas", () => {
    const p = page();
    expect([...p.classes]).toEqual(["light"]);
    p.click();
    expect([...p.classes]).toEqual(["dark"]);
    expect(p.stored()).toBe("true");
    expect(p.attributes["aria-checked"]).toBe("true");
    p.click();
    expect([...p.classes]).toEqual(["light"]);
    expect(p.stored()).toBe("false");
  });

  it("deja los botones de React a su hook, sin alternar dos veces", () => {
    const p = page({ saved: "true" });
    p.click(false);
    expect([...p.classes]).toEqual(["dark"]);
    expect(p.stored()).toBe("true");
  });

  it("funciona aunque el navegador bloquee localStorage", () => {
    const p = page({ storageBlocked: true });
    expect([...p.classes]).toEqual(["light"]);
    expect(() => p.click()).not.toThrow();
    expect([...p.classes]).toEqual(["dark"]);
    expect(p.attributes["aria-checked"]).toBe("true");
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  cleanTagNames,
  parseArticleInput,
  parseTaxonomyInput,
  syncTags,
} from "../content.js";

const cuerpo = "Un cuerpo con más de veinte caracteres para pasar la validación.";

describe("parseArticleInput al crear", () => {
  it("rechaza título corto, cuerpo corto y slug vacío", () => {
    expect(parseArticleInput({ title: "Ab", body: cuerpo }).error).toMatch(/título/);
    expect(parseArticleInput({ title: "Título válido", body: "corto" }).error).toMatch(/cuerpo/);
    expect(parseArticleInput({ title: "¿¿¿ !!! ???", body: cuerpo }).error).toMatch(/slug/);
  });

  it("deriva el slug del título y normaliza el resto", () => {
    const { data } = parseArticleInput({
      title: "  Gasolina 95 ó 98 en Canarias ",
      body: `  ${cuerpo}  `,
      excerpt: " frase ",
      categoryId: "",
      tags: ["Ahorro", "ahorro", "", " Canarias "],
      published: true,
    });
    expect(data).toEqual({
      title: "Gasolina 95 ó 98 en Canarias",
      body: cuerpo,
      excerpt: "frase",
      slug: "gasolina-95-o-98-en-canarias",
      categoryId: null,
      tags: ["Ahorro", "Canarias"],
      published: true,
    });
  });

  it("respeta un slug escrito a mano", () => {
    const { data } = parseArticleInput({ title: "Título válido", body: cuerpo, slug: "Mi Slug!" });
    expect(data.slug).toBe("mi-slug");
  });
});

describe("parseArticleInput al editar", () => {
  it("aplica las mismas reglas a los campos que llegan", () => {
    expect(parseArticleInput({ title: "Ab" }, { partial: true }).error).toMatch(/título/);
    expect(parseArticleInput({ body: "corto" }, { partial: true }).error).toMatch(/cuerpo/);
    expect(parseArticleInput({ excerpt: "x".repeat(301) }, { partial: true }).error).toMatch(
      /extracto/,
    );
    expect(parseArticleInput({ tags: "no-es-lista" }, { partial: true }).error).toMatch(
      /etiquetas/,
    );
  });

  it("no toca el slug si solo cambia el título", () => {
    const { data } = parseArticleInput({ title: "Título nuevo" }, { partial: true });
    expect(data).toEqual({ title: "Título nuevo" });
  });

  it("cambia el slug solo cuando el cliente lo manda", () => {
    expect(parseArticleInput({ slug: "Otro Slug" }, { partial: true }).data.slug).toBe("otro-slug");
    // Slug vacío con título: se vuelve a derivar del título.
    expect(
      parseArticleInput({ title: "Título nuevo", slug: "" }, { partial: true }).data.slug,
    ).toBe("titulo-nuevo");
    // Slug vacío sin título: no hay de dónde sacarlo.
    expect(parseArticleInput({ slug: "" }, { partial: true }).error).toMatch(/slug/);
  });

  it("permite quitar la categoría con null o cadena vacía", () => {
    expect(parseArticleInput({ categoryId: null }, { partial: true }).data.categoryId).toBeNull();
    expect(parseArticleInput({ categoryId: "" }, { partial: true }).data.categoryId).toBeNull();
    expect(parseArticleInput({}, { partial: true }).data.categoryId).toBeUndefined();
  });
});

describe("etiquetas y categorías", () => {
  it("cleanTagNames quita vacíos y duplicados por slug", () => {
    expect(cleanTagNames(["Diésel", "diesel", " ", "GLP", null, "glp "])).toEqual(["Diésel", "GLP"]);
  });

  it("parseTaxonomyInput exige nombre con letras y longitud razonable", () => {
    expect(parseTaxonomyInput({ name: "A" }).error).toMatch(/al menos/);
    expect(parseTaxonomyInput({ name: "x".repeat(41) }).error).toMatch(/no puede pasar/);
    expect(parseTaxonomyInput({ name: "¡¡!!" }).error).toMatch(/letras/);
    expect(parseTaxonomyInput({ name: " Mantenimiento " }).data).toEqual({
      name: "Mantenimiento",
      slug: "mantenimiento",
    });
  });

  it("syncTags reutiliza por slug y no renombra las que ya existen", async () => {
    const upsert = vi.fn(async ({ where, create }) => ({ id: where.slug, ...create }));
    const tags = await syncTags({ tag: { upsert } }, ["Ahorro", "AHORRO", "Canarias"]);

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0]).toEqual({
      where: { slug: "ahorro" },
      update: {},
      create: { name: "Ahorro", slug: "ahorro" },
    });
    expect(tags.map((t) => t.id)).toEqual(["ahorro", "canarias"]);
  });
});

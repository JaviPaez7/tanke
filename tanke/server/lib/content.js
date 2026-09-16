import { slugify } from "./auth.js";

// Reglas de las guías en un solo sitio: crear y editar validan lo mismo. Antes
// POST exigía título y cuerpo mínimos y PATCH aceptaba cualquier cosa, así que
// una guía correcta podía quedarse vacía al editarla.
export const ARTICLE_RULES = {
  titleMin: 4,
  titleMax: 160,
  excerptMax: 300,
  bodyMin: 20,
};

export const TAXONOMY_RULES = { nameMin: 2, nameMax: 40 };

/**
 * Limpia y valida los campos de una guía que vienen en el cuerpo de la
 * petición. Con `partial` solo se miran los campos presentes (PATCH); sin él,
 * título y cuerpo son obligatorios (POST).
 *
 * Devuelve `{ data }` con los valores ya normalizados o `{ error }` con un
 * mensaje pensado para la persona, no para el log.
 */
export function parseArticleInput(body = {}, { partial = false } = {}) {
  const data = {};
  const has = (key) => body?.[key] !== undefined;

  if (!partial || has("title")) {
    const title = String(body?.title ?? "").trim();
    if (title.length < ARTICLE_RULES.titleMin) {
      return { error: `El título debe tener al menos ${ARTICLE_RULES.titleMin} caracteres.` };
    }
    if (title.length > ARTICLE_RULES.titleMax) {
      return { error: `El título no puede pasar de ${ARTICLE_RULES.titleMax} caracteres.` };
    }
    data.title = title;
  }

  if (!partial || has("body")) {
    const text = String(body?.body ?? "").trim();
    if (text.length < ARTICLE_RULES.bodyMin) {
      return { error: `El cuerpo debe tener al menos ${ARTICLE_RULES.bodyMin} caracteres.` };
    }
    data.body = text;
  }

  if (!partial || has("excerpt")) {
    const excerpt = String(body?.excerpt ?? "").trim();
    if (excerpt.length > ARTICLE_RULES.excerptMax) {
      return { error: `El extracto no puede pasar de ${ARTICLE_RULES.excerptMax} caracteres.` };
    }
    data.excerpt = excerpt;
  }

  // Al crear, el slug sale del título si viene vacío. Al editar solo cambia si
  // el cliente lo manda: cambiarlo por sorpresa rompería enlaces compartidos.
  if (!partial || has("slug")) {
    const raw = String(body?.slug ?? "").trim();
    const slug = slugify(raw || data.title || "");
    if (!slug) return { error: "El slug no es válido: usa letras o números." };
    data.slug = slug;
  }

  if (typeof body?.published === "boolean") data.published = body.published;

  if (has("categoryId")) {
    data.categoryId = String(body.categoryId ?? "").trim() || null;
  }

  if (has("tags")) {
    if (!Array.isArray(body.tags)) return { error: "Las etiquetas deben ser una lista." };
    data.tags = cleanTagNames(body.tags);
  }

  return { data };
}

/** Quita vacíos y duplicados (por slug) de una lista de nombres de etiqueta. */
export function cleanTagNames(names = []) {
  const seen = new Set();
  const clean = [];
  for (const raw of names) {
    const name = String(raw ?? "").trim().slice(0, TAXONOMY_RULES.nameMax);
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    clean.push(name);
  }
  return clean;
}

/** Nombre y slug de una categoría o etiqueta, o un mensaje de error. */
export function parseTaxonomyInput(body = {}) {
  const name = String(body?.name ?? "").trim();
  if (name.length < TAXONOMY_RULES.nameMin) {
    return { error: `El nombre debe tener al menos ${TAXONOMY_RULES.nameMin} caracteres.` };
  }
  if (name.length > TAXONOMY_RULES.nameMax) {
    return { error: `El nombre no puede pasar de ${TAXONOMY_RULES.nameMax} caracteres.` };
  }
  const slug = slugify(body?.slug || name);
  if (!slug) return { error: "El nombre debe contener letras o números." };
  return { data: { name, slug } };
}

/**
 * Crea o reutiliza las etiquetas por slug con el cliente que se le pase
 * (normalmente la transacción), para que la guía y sus etiquetas se guarden
 * juntas o no se guarde nada.
 */
export async function syncTags(client, names = []) {
  const tags = [];
  for (const name of cleanTagNames(names)) {
    const slug = slugify(name);
    const tag = await client.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    tags.push(tag);
  }
  return tags;
}

/** Prisma señala una restricción única violada con el código P2002. */
export function isUniqueViolation(error) {
  return error?.code === "P2002";
}

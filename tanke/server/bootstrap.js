import { hashPassword } from "./lib/auth.js";

const GUIDES = [
  {
    title: "Cómo leer los precios de Tanke",
    slug: "como-leer-los-precios",
    excerpt:
      "Qué significan la media, el ahorro del depósito y los colores de cada combustible.",
    category: "Ahorro",
    tags: ["gasolina", "consejos"],
    body: `Tanke no inventa precios: los toma cada pocos minutos de la sede electrónica del Ministerio de Industria.

La cifra grande de cada tarjeta es el combustible que tienes activo (95, 98, diésel…). El resto se muestra para comparar de un vistazo.

Si activas el simulador de depósito, verás el coste total y cuánto te ahorras frente a la media de la zona. Ese “ahorras” es la diferencia entre el litro medio y el litro de esa estación, multiplicado por tus litros.

El mapa pinta en verde las estaciones por debajo de la media, en rojo las caras y con corona la más barata del recorte visible.

Los favoritos y las alertas viven en tu cuenta: así no dependes del navegador ni del móvil de turno.`,
  },
  {
    title: "Gasolina 95 o 98 en Canarias",
    slug: "gasolina-95-o-98-en-canarias",
    excerpt:
      "Cuándo merece la 98 y cuándo estás pagando octanaje que el motor no pide.",
    category: "Combustibles",
    tags: ["gasolina", "canarias"],
    body: `La mayoría de turismos modernos están homologados para 95. La 98 solo aporta si el fabricante la recomienda o si el motor pica por el calor y la carga.

En Canarias el diferencial 95/98 suele ser de varios céntimos. En un depósito de 50 L eso son euros que no vuelven.

Usa Tanke para mirar las dos columnas en tu municipio antes de decidir. Si tu coche admite 95, la estación más barata de 95 gana casi siempre a una 98 “de marca”.

El diésel+ es el mismo caso: aditivos de marketing salvo que notes pérdida de potencia o el taller lo pida.`,
  },
  {
    title: "Alertas de precio que sí merecen la pena",
    slug: "alertas-de-precio",
    excerpt:
      "Cómo poner un umbral realista para Telde, La Laguna o tu pueblo sin volverte loco.",
    category: "Ahorro",
    tags: ["alertas", "consejos"],
    body: `Una alerta útil mira el mínimo de tu zona, no el de toda la isla. En Tanke puedes acotar provincia y municipio.

Mira primero la media del buscador y pon el umbral un par de céntimos por debajo. Si pones 1,00 € en diésel cuando la zona está en 1,22 €, la alerta no saltará nunca.

Las alertas se evalúan con los precios en vivo del Ministerio. El histórico diario (Canarias) te dice si hoy es un buen día o si conviene esperar al camión de la semana.

Si ves un precio imposible, mándanos un aviso desde tu cuenta: horario mal, estación cerrada o cifra sospechosa. El panel de administración los revisa.`,
  },
];

export async function ensureAdmin(prisma) {
  const email = (process.env.ADMIN_EMAIL || "admin@tanke.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "TankeAdmin2026";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin", active: true },
      });
    }
    return existing;
  }

  const admin = await prisma.user.create({
    data: {
      email,
      name: "Administrador",
      role: "admin",
      passwordHash: await hashPassword(password),
    },
  });
  console.log(`Tanke: admin listo (${email})`);
  return admin;
}

export async function ensureContent(prisma) {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) return;

  const count = await prisma.article.count();
  if (count > 0) return;

  const categories = {};
  for (const name of ["Ahorro", "Combustibles", "Canarias"]) {
    const slug = name.toLowerCase();
    categories[name] = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  for (const guide of GUIDES) {
    const tags = [];
    for (const tagName of guide.tags) {
      const slug = tagName.toLowerCase();
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: { name: tagName },
        create: { name: tagName, slug },
      });
      tags.push(tag);
    }

    await prisma.article.create({
      data: {
        title: guide.title,
        slug: guide.slug,
        excerpt: guide.excerpt,
        body: guide.body,
        published: true,
        categoryId: categories[guide.category]?.id,
        authorId: admin.id,
        tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
      },
    });
  }

  console.log("Tanke: guías iniciales publicadas");
}

export async function bootstrap(prisma) {
  if (!prisma) {
    console.warn("Tanke: DATABASE_URL ausente — cuentas y admin desactivados");
    return;
  }
  await ensureAdmin(prisma);
  await ensureContent(prisma);
}

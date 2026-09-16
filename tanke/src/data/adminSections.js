import {
  GridIcon,
  NewspaperIcon,
  SyncIcon,
  TagIcon,
  UsersIcon,
  WarningIcon,
} from "../icons";

// Una sección = una tarea de gestión. El título y la frase viven aquí para que
// la cabecera del panel y el menú nunca se contradigan.
export const ADMIN_SECTIONS = [
  {
    id: "overview",
    label: "Resumen",
    icon: GridIcon,
    title: "Resumen",
    description: "Cómo va el sitio y qué está esperando por ti.",
  },
  {
    id: "users",
    label: "Usuarios",
    icon: UsersIcon,
    title: "Usuarios registrados",
    description: "Cambia el rol o desactiva una cuenta sin borrar sus datos.",
  },
  {
    id: "articles",
    label: "Guías",
    icon: NewspaperIcon,
    title: "Guías publicadas",
    description:
      "El contenido que se ve en /guias. Se puede dejar en borrador.",
  },
  {
    id: "taxonomy",
    label: "Categorías",
    icon: TagIcon,
    title: "Categorías y etiquetas",
    description:
      "Cómo se agrupan las guías. Borrar una categoría no borra sus guías.",
  },
  {
    id: "reports",
    label: "Avisos",
    icon: WarningIcon,
    title: "Avisos de usuarios",
    description: "Errores de precio u horario que nos han reportado.",
  },
  {
    id: "ingestion",
    label: "Ingesta",
    icon: SyncIcon,
    title: "Ingesta de precios",
    description:
      "Copia diaria de los precios del Ministerio que alimenta el histórico.",
  },
];

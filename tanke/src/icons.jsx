import { ICON_PATHS } from "./iconPaths";

// Un icono = un <path> de Phosphor sobre un viewBox de 256. Hereda el color del
// texto (`currentColor`) y el tamaño se controla con clases de Tailwind.
function makeIcon(pathData, title) {
  function Icon({ className = "w-4 h-4 shrink-0", ...rest }) {
    return (
      <svg
        viewBox="0 0 256 256"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...rest}
      >
        <path d={pathData} />
      </svg>
    );
  }
  Icon.displayName = title;
  return Icon;
}

export const MapPinIcon = makeIcon(ICON_PATHS.mapPin, "MapPinIcon");
export const MapIcon = makeIcon(ICON_PATHS.map, "MapIcon");
export const GasPumpIcon = makeIcon(ICON_PATHS.gasPump, "GasPumpIcon");
export const ListIcon = makeIcon(ICON_PATHS.list, "ListIcon");
export const CrownIcon = makeIcon(ICON_PATHS.crown, "CrownIcon");
export const BroadcastIcon = makeIcon(ICON_PATHS.broadcast, "BroadcastIcon");
export const TagIcon = makeIcon(ICON_PATHS.tag, "TagIcon");
export const XIcon = makeIcon(ICON_PATHS.x, "XIcon");
export const ArrowUpRightIcon = makeIcon(ICON_PATHS.arrowUpRight, "ArrowUpRightIcon");
export const ArrowUpIcon = makeIcon(ICON_PATHS.arrowUp, "ArrowUpIcon");
export const SearchIcon = makeIcon(ICON_PATHS.search, "SearchIcon");
export const SunIcon = makeIcon(ICON_PATHS.sun, "SunIcon");
export const MoonIcon = makeIcon(ICON_PATHS.moon, "MoonIcon");

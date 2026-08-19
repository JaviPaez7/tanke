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
export const HeartIcon = makeIcon(ICON_PATHS.heart, "HeartIcon");
export const HeartFillIcon = makeIcon(ICON_PATHS.heartFill, "HeartFillIcon");
export const UserIcon = makeIcon(ICON_PATHS.user, "UserIcon");
export const SignInIcon = makeIcon(ICON_PATHS.signIn, "SignInIcon");
export const SignOutIcon = makeIcon(ICON_PATHS.signOut, "SignOutIcon");
export const BellIcon = makeIcon(ICON_PATHS.bell, "BellIcon");
export const NewspaperIcon = makeIcon(ICON_PATHS.newspaper, "NewspaperIcon");
export const ChartLineIcon = makeIcon(ICON_PATHS.chartLine, "ChartLineIcon");
export const WarningIcon = makeIcon(ICON_PATHS.warning, "WarningIcon");
export const GearIcon = makeIcon(ICON_PATHS.gear, "GearIcon");
export const EyeIcon = makeIcon(ICON_PATHS.eye, "EyeIcon");
export const EyeSlashIcon = makeIcon(ICON_PATHS.eyeSlash, "EyeSlashIcon");
export const UsersIcon = makeIcon(ICON_PATHS.users, "UsersIcon");
export const SyncIcon = makeIcon(ICON_PATHS.arrowsClockwise, "SyncIcon");
export const GridIcon = makeIcon(ICON_PATHS.squaresFour, "GridIcon");
export const HouseIcon = makeIcon(ICON_PATHS.house, "HouseIcon");

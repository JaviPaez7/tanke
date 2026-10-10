import { ThemeSwitch } from "../../shared/pageChrome.js";

export function DarkToggle({ isDark, setIsDark, className = "" }) {
  return <ThemeSwitch isDark={isDark} onClick={() => setIsDark(!isDark)} className={className} />;
}

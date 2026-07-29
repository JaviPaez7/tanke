import { useEffect, useState } from "react";

function readInitialTheme() {
  const saved = localStorage.getItem("tanke_dark");
  if (saved === "true") return true;
  if (saved === "false") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const [isDark, setIsDark] = useState(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    localStorage.setItem("tanke_dark", String(isDark));

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#090f1d" : "#f6f7fb");
  }, [isDark]);

  return {
    isDark,
    toggleTheme: () => setIsDark((v) => !v),
    setIsDark,
  };
}

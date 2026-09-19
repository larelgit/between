"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="between-appearance"
    >
      {children}
    </ThemeProvider>
  );
}

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = !mounted || theme !== "light";
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      <span className="theme-disc" aria-hidden="true" />
      {dark ? "Light theme" : "Dark theme"}
    </button>
  );
}

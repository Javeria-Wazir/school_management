"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Light / dark / system theme, remembered per browser (the `dark` class on <html>). Print pages are always
 * light: result cards are designed for paper.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange forcedTheme={pathname.startsWith("/print") ? "light" : undefined}>
      {children}
    </NextThemesProvider>
  );
}

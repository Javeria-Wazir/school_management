/**
 * The ten approved result-card designs, one per class (Class 1 → theme 1 … Class 10 → theme 10).
 * Accents and tint strengths are the ones chosen in the design review. The layouts themselves are
 * in theme-01.tsx … theme-10.tsx (see components.ts); this file has no React so services can use it.
 */

export interface ThemeMeta {
  number: number;
  name: string;
  accent: string;
  /** Opacity of the accent tint used for soft backgrounds. */
  softAlpha: number;
}

export const THEMES: readonly ThemeMeta[] = [
  { number: 1, name: "Little Stars", accent: "#F2B33D", softAlpha: 0.22 },
  { number: 2, name: "Bright Sprouts", accent: "#3FA36B", softAlpha: 0.16 },
  { number: 3, name: "Ocean Explorers", accent: "#2A9DA6", softAlpha: 0.16 },
  { number: 4, name: "Sky Rockets", accent: "#E86F51", softAlpha: 0.35 },
  { number: 5, name: "Rainbow Bridge", accent: "#8E6CC9", softAlpha: 0.2 },
  { number: 6, name: "Navigators", accent: "#D08A2A", softAlpha: 0.2 },
  { number: 7, name: "Explorers", accent: "#2E8C7A", softAlpha: 0.18 },
  { number: 8, name: "Innovators", accent: "#E0812B", softAlpha: 0.2 },
  { number: 9, name: "Scholars", accent: "#1E95BF", softAlpha: 0.18 },
  { number: 10, name: "Achievers", accent: "#C59A2E", softAlpha: 0.16 },
];

/** "Class 7" → theme 7. Classes without a number 1–10 in their name use their sort order instead. */
export function themeForClass(className: string, sortOrder: number): ThemeMeta {
  const match = className.match(/\b(10|[1-9])\b/);
  const n = match ? Number(match[1]) : ((Math.max(sortOrder, 1) - 1) % THEMES.length) + 1;
  return THEMES[n - 1];
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function softColor(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lightColor(hex: string, factor: number): string {
  const mix = (c: number) => Math.round(c + (255 - c) * factor);
  const [r, g, b] = rgb(hex);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

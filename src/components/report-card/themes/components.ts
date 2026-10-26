import type { ComponentType } from "react";
import type { CardView } from "../types";
import { Theme01 } from "./theme-01";
import { Theme02 } from "./theme-02";
import { Theme03 } from "./theme-03";
import { Theme04 } from "./theme-04";
import { Theme05 } from "./theme-05";
import { Theme06 } from "./theme-06";
import { Theme07 } from "./theme-07";
import { Theme08 } from "./theme-08";
import { Theme09 } from "./theme-09";
import { Theme10 } from "./theme-10";

/** Layout component of each theme, by theme number − 1 (same order as THEMES). */
export const THEME_COMPONENTS: readonly ComponentType<{ v: CardView }>[] = [Theme01, Theme02, Theme03, Theme04, Theme05, Theme06, Theme07, Theme08, Theme09, Theme10];

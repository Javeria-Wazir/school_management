import { Inter, Nunito, Playfair_Display, Poppins } from "next/font/google";
import "./print.css";

// The result-card designs use these four families; self-hosted by Next.js so printing works offline.
const nunito = Nunito({ variable: "--rc-font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });
const inter = Inter({ variable: "--rc-font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--rc-font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ variable: "--rc-font-playfair", subsets: ["latin"], weight: ["600", "700", "800"] });

/** Print pages have no app shell: just a toolbar (hidden when printing) and A4 sheets. */
export default function PrintLayout({ children }: LayoutProps<"/print">) {
  return <div className={`${nunito.variable} ${inter.variable} ${poppins.variable} ${playfair.variable} rc-print-root`}>{children}</div>;
}

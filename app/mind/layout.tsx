import { DM_Sans, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-mind",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Tu cerebro · Animus",
  description: "Grafo de memoria personal",
};

export default function MindLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${jetbrains.variable}`}>{children}</div>
  );
}

import { Geist, Geist_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { ThemeInitScript } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

/**
 * Root shell for all routes (including admin outside `[locale]`).
 * Public pages refine `lang` via DocumentLang in the locale layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} flex min-h-screen flex-col font-sans`}
      >
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}

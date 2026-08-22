import { Geist, Geist_Mono, Sora } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { ThemeInitScript } from "@/components/ThemeProvider";
import {
  DEFAULT_LOCALE,
  getLocaleDefinition,
  isAppLocale,
} from "@/i18n/locales";
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
 * Public locale is read from next-intl's request header.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerLocale = (await headers()).get("x-next-intl-locale");
  const locale =
    headerLocale && isAppLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;
  const htmlLang = getLocaleDefinition(locale).htmlLang;

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} flex min-h-screen flex-col font-sans`}
      >
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}

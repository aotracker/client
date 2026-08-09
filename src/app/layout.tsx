import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Navbar } from "@/components/Navbar";
import { RegionPreferenceSync } from "@/components/RegionPreferenceSync";
import { StatusBanner } from "@/components/StatusBanner";
import {
  ThemeProvider,
  THEME_INIT_SCRIPT,
} from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { getServerPreferredRegion } from "@/lib/region-preference-server";
import { SITE_NAME } from "@/lib/site";
import { DEFAULT_DESCRIPTION, getSiteUrl } from "@/lib/seo";

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

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferredRegion = await getServerPreferredRegion();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} flex min-h-screen flex-col font-sans`}
      >
        <ThemeProvider>
          <ToastProvider>
            <RegionPreferenceSync />
            <Navbar regions={ENABLED_REGIONS} preferredRegion={preferredRegion} />
            <StatusBanner />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </ThemeProvider>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}

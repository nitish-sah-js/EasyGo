import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./journey-loader.css";
import "leaflet/dist/leaflet.css";
import "./leaflet-overrides.css";
import { AppShell } from "@/components/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { JourneyLoader } from "@/components/journey-loader";
import { QueryProvider } from "@/lib/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextTour",
  description: "AI-powered unified travel planning MVP with deterministic mock data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Every place/city photo redirects here — this app has no existing
            connection to Wikimedia's CDN otherwise, so the first image on
            any page pays a full DNS+TCP+TLS handshake before the browser
            even starts the actual image fetch. Preconnecting overlaps that
            handshake with the rest of page load instead. */}
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
      </head>
      <body className={inter.className}>
        <JourneyLoader />
        <QueryProvider>
          <AppShell>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}

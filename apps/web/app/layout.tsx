import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/lib/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextTour",
  description: "AI-powered unified travel planning MVP with deterministic mock data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AppShell>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}

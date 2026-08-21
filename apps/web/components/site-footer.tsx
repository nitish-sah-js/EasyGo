import Link from "next/link";
import { Route } from "lucide-react";

const footerLinks = [
  { href: "/", label: "Explore" },
  { href: "/plan", label: "Plan a trip" },
  { href: "/trips", label: "My trips" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 text-white">
            <Route className="h-4 w-4" />
          </span>
          <span className="font-bold tracking-tight text-foreground">
            Next<span className="text-brand-600">Tour</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-7 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
          Unified travel planning, powered by live provider data.
        </p>
      </div>
    </footer>
  );
}

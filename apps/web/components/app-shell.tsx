"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, MotionConfig, useScroll, useTransform } from "framer-motion";
import { Bell, Compass, LogOut, Route, Sparkles, Ticket } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/motion/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CurrentUserResponse } from "@/types/trips";

const navLinks = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/plan", label: "Plan", icon: Sparkles },
  { href: "/trips", label: "My Trips", icon: Ticket },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<CurrentUserResponse>("/api/auth/me"),
    retry: false,
  });
  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const user = data?.user;

  // Header solidifies as the page scrolls: near-transparent at rest, a
  // bordered/blurred surface once there's content passing underneath it.
  const { scrollY } = useScroll();
  const chromeOpacity = useTransform(scrollY, [0, 72], [0, 1]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        <motion.header
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="sticky top-0 z-40"
        >
          <motion.div
            aria-hidden
            style={{ opacity: chromeOpacity }}
            className="absolute inset-0 border-b border-border bg-surface/90 shadow-sm backdrop-blur-xl"
          />
          <div className="relative mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-card">
                <Route className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Next<span className="text-brand-700">Tour</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-11 items-center rounded-[12px] px-4 text-[0.9375rem] font-semibold transition duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      active ? "text-brand-700" : "text-muted-foreground hover:bg-brand-50 hover:text-brand-700",
                    )}
                  >
                    {link.label}
                    {active ? (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-brand-600"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    aria-label="Notifications"
                    className="hidden h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-100 hover:text-brand-700 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex"
                  >
                    <Bell className="h-[1.15rem] w-[1.15rem] shrink-0" />
                  </button>
                  <Link href="/plan" className="hidden sm:block">
                    <Button size="sm" shape="pill">
                      Plan a trip
                    </Button>
                  </Link>
                  <span
                    title={user.name}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-300 text-sm font-bold text-brand-800 ring-2 ring-white"
                  >
                    {initialsOf(user.name)}
                  </span>
                  <Button
                    aria-label="Log out"
                    size="icon"
                    variant="ghost"
                    shape="pill"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" shape="pill">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" shape="pill">
                      Get started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.header>

        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}

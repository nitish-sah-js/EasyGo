"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Map, PlaneTakeoff, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { CurrentUserResponse } from "@/types/trips";

export function AppShell({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-white/88 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
              <Map className="h-5 w-5" />
            </span>
            NextTour
          </Link>
          <nav className="flex items-center gap-2">
            {data?.user ? (
              <>
                <Link href="/trips" className="hidden text-sm font-medium text-slate-700 hover:text-slate-950 sm:inline">
                  Trips
                </Link>
                <Link href="/plan">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Plan
                  </Button>
                </Link>
                <Button
                  aria-label="Log out"
                  size="icon"
                  variant="ghost"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    <PlaneTakeoff className="h-4 w-4" />
                    Register
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { CurrentUser, CurrentUserResponse } from "@/types/trips";

export function useAuth() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<CurrentUserResponse>("/api/auth/me"),
    retry: false,
    staleTime: 60_000,
  });

  const user: CurrentUser | undefined = query.data?.user;
  const isLoading = query.isLoading;

  return { user, isLoading, isAuthenticated: Boolean(user) };
}
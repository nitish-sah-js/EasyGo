"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@nexttour/shared";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "demo@nexttour.local", password: "password123" },
  });
  const mutation = useMutation({
    mutationFn: (values: LoginInput) =>
      apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/plan");
    },
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up planning where you left off."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-lavender-600 hover:text-lavender-700">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Email">
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        {mutation.error ? (
          <p className="rounded-xl border border-blush-200 bg-blush-100 px-4 py-3 text-sm text-blush-900">
            {mutation.error.message}
          </p>
        ) : null}
        <Button size="lg" className="w-full" disabled={mutation.isPending}>
          <LogIn className="h-4 w-4" />
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

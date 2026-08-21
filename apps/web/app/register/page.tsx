"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@nexttour/shared";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: RegisterInput) =>
      apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/plan");
    },
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start planning trips across flights, trains, buses and stays."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Name">
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        {mutation.error ? (
          <p className="rounded-xl border border-blush-200 bg-blush-100 px-4 py-3 text-sm text-blush-900">
            {mutation.error.message}
          </p>
        ) : null}
        <Button size="lg" block disabled={mutation.isPending}>
          <UserPlus />
          {mutation.isPending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

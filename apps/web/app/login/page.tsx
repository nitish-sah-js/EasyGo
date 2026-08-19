"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@nexttour/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Email</span>
              <Input type="email" {...form.register("email")} />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>Password</span>
              <Input type="password" {...form.register("password")} />
            </label>
            {mutation.error ? <p className="text-sm text-rose-600">{mutation.error.message}</p> : null}
            <Button className="w-full" disabled={mutation.isPending}>
              <LogIn className="h-4 w-4" />
              Login
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            New here?{" "}
            <Link href="/register" className="font-medium text-cyan-700">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@nexttour/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Name</span>
              <Input {...form.register("name")} />
            </label>
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
              <UserPlus className="h-4 w-4" />
              Register
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-600">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-cyan-700">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

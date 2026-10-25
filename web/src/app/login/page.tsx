"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { FullPageLoader } from "@/components/full-page-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { dashboardPathFor, useAuth } from "@/lib/auth-provider";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, status } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      router.replace(dashboardPathFor(user.role));
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Unable to sign in. Please try again.",
      );
    }
  }

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(dashboardPathFor(user.role));
    }
  }, [status, user, router]);

  if (status === "loading") {
    return <FullPageLoader label="Checking your session" />;
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to submit projects and follow mentor reviews."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

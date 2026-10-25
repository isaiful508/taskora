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
import { signupFormSchema, type SignupFormValues } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const { signup, user, status } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupFormValues) {
    setServerError(null);
    try {
      const user = await signup(values.name, values.email, values.password);
      router.replace(dashboardPathFor(user.role));
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Unable to create the account. Please try again.",
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
      title="Create your student account"
      subtitle="Sign up to submit your project for review."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
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
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

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
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters with a number"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters, including at least one letter and one number.
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

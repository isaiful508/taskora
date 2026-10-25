"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { FullPageLoader } from "@/components/full-page-loader";
import { useAuth } from "@/lib/auth-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return <FullPageLoader label="Checking your session" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/full-page-loader";
import { dashboardPathFor, useAuth } from "@/lib/auth-provider";

export default function Home() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(user ? dashboardPathFor(user.role) : "/login");
  }, [status, user, router]);

  return <FullPageLoader />;
}

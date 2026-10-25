"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/full-page-loader";
import { dashboardPathFor, useAuth } from "@/lib/auth-provider";

export default function DashboardIndexPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(dashboardPathFor(user.role));
    }
  }, [status, user, router]);

  return <FullPageLoader label="Opening your dashboard" />;
}

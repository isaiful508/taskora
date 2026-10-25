"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/full-page-loader";
import { ReviewDashboard } from "@/components/review-dashboard";
import { useAuth } from "@/lib/auth-provider";

export default function MentorDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user?.role === "STUDENT") {
      router.replace("/dashboard/student");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || !user) {
    return <FullPageLoader label="Loading review queue" />;
  }

  return <ReviewDashboard />;
}

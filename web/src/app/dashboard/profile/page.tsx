"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/full-page-loader";
import { useAuth } from "@/lib/auth-provider";

export default function ProfilePage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return <FullPageLoader label="Loading profile" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The account you use to sign in to Project Review.
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl bg-card p-6 text-sm ring-1 ring-foreground/10 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-1 font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="mt-1 font-medium">
            {user.role === "MENTOR" ? "Mentor (reviewer)" : "Student (submitter)"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="mt-1 font-mono text-xs text-muted-foreground">{user.id}</dd>
        </div>
      </dl>
    </div>
  );
}

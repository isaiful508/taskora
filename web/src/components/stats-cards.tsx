"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Inbox, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const STAT_CARDS = [
  {
    key: "total",
    label: "Total submissions",
    icon: Inbox,
    className: "text-foreground",
    ringClass: "ring-foreground/10",
  },
  {
    key: "pending",
    label: "Pending review",
    icon: Clock,
    className: "text-amber-600 dark:text-amber-400",
    ringClass: "ring-amber-500/20",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
    ringClass: "ring-emerald-500/20",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
    ringClass: "ring-red-500/20",
  },
] as const;

export function StatsCards() {
  const { data, isPending } = useQuery({
    queryKey: ["stats"],
    queryFn: api.submissions.stats,
  });

  const stats = data?.stats;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} size="sm" className={`ring-1 ${card.ringClass}`}>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                {isPending ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-semibold tabular-nums">
                    {stats ? stats[card.key] : 0}
                  </p>
                )}
              </div>
              <span
                className={`grid size-9 place-items-center rounded-lg bg-muted ${card.className}`}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

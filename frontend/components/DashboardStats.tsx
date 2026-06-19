"use client";

import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Wallet,
  ChevronRight,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatStatus,
  getStatusColor,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { StatsResponse } from "@/types";

interface DashboardStatsProps {
  stats: StatsResponse | null;
  loading?: boolean;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const cards = [
    {
      title: "Total Invoices",
      value: String(stats.total_invoices),
      icon: FileText,
      tint: "text-slate-600 bg-slate-100",
    },
    {
      title: "Pending Review",
      value: String(stats.pending_review),
      icon: Clock,
      tint: "text-amber-600 bg-amber-50",
    },
    {
      title: "Approved",
      value: String(stats.approved),
      icon: CheckCircle2,
      tint: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Approved Amount",
      value: formatCurrency(stats.total_approved_amount, "USD"),
      icon: Wallet,
      tint: "text-primary bg-accent",
    },
  ];

  const confPct = Math.round((stats.average_confidence || 0) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-card-hover">
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-brand-ink tnum">
                  {card.value}
                </p>
              </div>
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  card.tint
                )}
              >
                <card.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Gauge className="h-4 w-4 text-primary" />
              Average Extraction Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={confPct} className="h-2 flex-1" />
              <span className="text-2xl font-semibold text-brand-ink tnum">{confPct}%</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Across all processed invoices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Extraction Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="mt-1 text-xl font-semibold text-brand-ink tnum">
                  ${parseFloat(stats.extraction_cost_this_month).toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last month</p>
                <p className="mt-1 text-xl font-semibold text-muted-foreground tnum">
                  ${parseFloat(stats.extraction_cost_last_month).toFixed(4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-brand-ink">
            Recent Invoices
          </CardTitle>
          <Link
            href="/invoices"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recent_invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">No invoices yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your first invoice to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.recent_invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/review/${inv.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {inv.vendor_name || "Unknown vendor"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {inv.invoice_number || "—"} · {formatDate(inv.invoice_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <Badge
                        variant="outline"
                        className={cn("border", getStatusColor(inv.status))}
                      >
                        {formatStatus(inv.status)}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(inv.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

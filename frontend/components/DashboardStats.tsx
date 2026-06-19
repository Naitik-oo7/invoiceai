"use client";

import Link from "next/link";
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Total Invoices", value: stats.total_invoices, color: "" },
    { title: "Pending Review", value: stats.pending_review, color: "text-amber-600" },
    { title: "Approved", value: stats.approved, color: "text-emerald-600" },
    {
      title: "Total Approved Amount",
      value: formatCurrency(stats.total_approved_amount, "USD"),
      color: "text-primary",
    },
  ];

  const confPct = Math.round((stats.average_confidence || 0) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Extraction Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={confPct} className="flex-1" />
              <span className="text-lg font-bold">{confPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Extraction Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This month</p>
                <p className="text-xl font-bold">${parseFloat(stats.extraction_cost_this_month).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last month</p>
                <p className="text-xl font-bold">${parseFloat(stats.extraction_cost_last_month).toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recent_invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/review/${inv.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium">{inv.vendor_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {inv.invoice_number || "—"} · {formatDate(inv.invoice_date)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={cn(getStatusColor(inv.status))}>{formatStatus(inv.status)}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(inv.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

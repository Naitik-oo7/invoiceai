"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Upload, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DashboardStats } from "@/components/DashboardStats";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { StatsResponse } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      setStats(await api.getStats(token));
    } catch (err) {
      setError(true);
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="A live snapshot of your invoice pipeline — extractions, reviews and spend."
        actions={
          <Button asChild>
            <Link href="/upload">
              <Upload className="h-4 w-4" />
              Upload invoice
            </Link>
          </Button>
        }
      />
      {error && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="mt-4 text-base font-semibold text-brand-ink">Couldn&rsquo;t load your dashboard</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Something went wrong fetching your stats. Check your connection and try again.
          </p>
          <Button variant="outline" className="mt-5" onClick={loadStats}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ) : (
        <DashboardStats stats={stats} loading={loading} />
      )}
    </div>
  );
}

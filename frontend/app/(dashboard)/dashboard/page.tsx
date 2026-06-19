"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { DashboardStats } from "@/components/DashboardStats";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { StatsResponse } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = (session as { accessToken?: string })?.accessToken;
    if (!token) return;
    api.getStats(token).then(setStats).finally(() => setLoading(false));
  }, [session]);

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
      <DashboardStats stats={stats} loading={loading} />
    </div>
  );
}

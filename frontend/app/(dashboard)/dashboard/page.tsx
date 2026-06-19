"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardStats } from "@/components/DashboardStats";
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <DashboardStats stats={stats} loading={loading} />
    </div>
  );
}

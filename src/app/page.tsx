"use client";

import { useMemo } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { useBlobCsv } from "@/lib/use-blob-csv";
import SyncBanner from "@/components/SyncBanner";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/components/AuthProvider";

function toBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.toLowerCase().trim() === "true";
}

export default function OverviewPage() {
  const { rawData: inspRaw, loading: loadingInsp, source: inspSource, syncInfo } = useBlobCsv("inspections");
  const { rawData: defRaw, loading: loadingDef } = useBlobCsv("defects");
  const { rawData: woRaw, loading: loadingWO } = useBlobCsv("work_orders");
  const { user } = useAuth();

  const loading = loadingInsp || loadingDef || loadingWO;
  const autoLoaded = inspSource === "blob";

  // Filter by user's DSP if assigned
  const filteredInsp = useMemo(() => {
    if (!user?.dsp) return inspRaw;
    return inspRaw.filter((r) => r["DSP Name"] === user.dsp);
  }, [inspRaw, user?.dsp]);

  const filteredDef = useMemo(() => {
    if (!user?.dsp) return defRaw;
    return defRaw.filter((r) => r["Organization Name"] === user.dsp);
  }, [defRaw, user?.dsp]);

  const filteredWO = useMemo(() => {
    if (!user?.dsp) return woRaw;
    return woRaw.filter((r) => r["DSP Name"] === user.dsp);
  }, [woRaw, user?.dsp]);

  const inspCount = filteredInsp.length;
  const defCount = filteredDef.length;
  const woCount = filteredWO.length;

  const completedWO = useMemo(
    () => filteredWO.filter((r) => r["Work Order Completed At (EST)"]).length,
    [filteredWO]
  );
  const acceptedWO = useMemo(
    () => filteredWO.filter((r) => toBool(r["Work Order Accepted"])).length,
    [filteredWO]
  );
  const pendingWO = useMemo(
    () =>
      filteredWO.filter(
        (r) => !toBool(r["Work Order Accepted"]) && !r["Work Order Completed At (EST)"]
      ).length,
    [filteredWO]
  );

  const hasData = inspCount > 0 || defCount > 0 || woCount > 0;

  return (
    <div>
      {loading ? (
        <DashboardSkeleton />
      ) : hasData ? (
        <>
          {autoLoaded && (
            <SyncBanner syncTimestamp={syncInfo?.timestamp} variant="banner" />
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Vehicles Inspected"
              value={inspCount}
              color="#2563eb"
            />
            <StatCard
              title="Defects Reported"
              value={defCount}
              color="#f59e0b"
            />
            <StatCard
              title="Work Orders"
              value={woCount}
              subtitle={`${completedWO} completed`}
              color="#10b981"
            />
            <StatCard
              title="Pending WOs"
              value={pendingWO}
              subtitle={`${acceptedWO} accepted`}
              color="#ef4444"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/inspections"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-[#1a3a5f] mb-2">
                🔍 Inspections
              </h3>
              <p className="text-3xl font-bold text-blue-600">{inspCount}</p>
              <p className="text-sm text-gray-500 mt-1">vehicles inspected</p>
            </Link>
            <Link
              href="/defects"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-[#1a3a5f] mb-2">
                ⚠️ Defects
              </h3>
              <p className="text-3xl font-bold text-yellow-600">{defCount}</p>
              <p className="text-sm text-gray-500 mt-1">defects reported</p>
            </Link>
            <Link
              href="/work-orders"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-[#1a3a5f] mb-2">
                🔧 Work Orders
              </h3>
              <p className="text-3xl font-bold text-green-600">{woCount}</p>
              <p className="text-sm text-gray-500 mt-1">
                {completedWO} completed · {pendingWO} pending
              </p>
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          icon="\ud83d\udcca"
          title="Welcome to DFS Fleet Metrics"
          description="No data available yet. The agent syncs daily at 7:00 AM EST, or navigate to a specific tab to upload CSVs manually."
        />
      )}
    </div>
  );
}

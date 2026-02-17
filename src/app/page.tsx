"use client";

import { useMemo } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { useBlobCsv } from "@/lib/use-blob-csv";

function toBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.toLowerCase().trim() === "true";
}

export default function OverviewPage() {
  const { rawData: inspRaw, loading: loadingInsp, source: inspSource } = useBlobCsv("inspections");
  const { rawData: defRaw, loading: loadingDef } = useBlobCsv("defects");
  const { rawData: woRaw, loading: loadingWO } = useBlobCsv("work_orders");

  const loading = loadingInsp || loadingDef || loadingWO;
  const autoLoaded = inspSource === "blob";

  const inspCount = inspRaw.length;
  const defCount = defRaw.length;
  const woCount = woRaw.length;

  const completedWO = useMemo(
    () => woRaw.filter((r) => r["Work Order Completed At (EST)"]).length,
    [woRaw]
  );
  const acceptedWO = useMemo(
    () => woRaw.filter((r) => toBool(r["Work Order Accepted"])).length,
    [woRaw]
  );
  const pendingWO = useMemo(
    () =>
      woRaw.filter(
        (r) => !toBool(r["Work Order Accepted"]) && !r["Work Order Completed At (EST)"]
      ).length,
    [woRaw]
  );

  const hasData = inspCount > 0 || defCount > 0 || woCount > 0;

  return (
    <div>
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      ) : hasData ? (
        <>
          {autoLoaded && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-sm text-green-700">
              Data loaded automatically from latest email report
            </div>
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
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <h2 className="text-xl font-semibold text-[#1a3a5f] mb-2">
            Welcome to DFS Fleet Metrics
          </h2>
          <p className="text-gray-500 mb-4">
            No data available yet. The agent syncs daily at 7:00 AM EST, or
            navigate to a specific tab to upload CSVs manually.
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <span>🔍 Inspections</span>
            <span>⚠️ Defects</span>
            <span>🔧 Work Orders</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Papa from "papaparse";
import StatCard from "@/components/StatCard";

interface WORow {
  dspName: string;
  vehicleFleetId: string;
  defectDescription: string;
  defectReportedAt: string;
  workOrderCreatedAt: string;
  workApprovedBy: string;
  technician: string;
  technicianResponseAt: string;
  workOrderAccepted: boolean;
  workOrderCompletedAt: string;
}

type WOStatus = "Pending" | "Accepted" | "Completed";

function toBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.toLowerCase().trim() === "true";
}

function getStatus(wo: WORow): WOStatus {
  if (wo.workOrderCompletedAt) return "Completed";
  if (wo.workOrderAccepted) return "Accepted";
  return "Pending";
}

function timeDiffHours(from: string, to: string): string {
  if (!from || !to) return "-";
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (isNaN(diff) || diff < 0) return "-";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hours}h ${mins}m`;
}

function timeInStatus(wo: WORow): string {
  const status = getStatus(wo);
  const now = new Date().toISOString();

  switch (status) {
    case "Completed":
      return timeDiffHours(wo.workOrderCreatedAt, wo.workOrderCompletedAt);
    case "Accepted":
      return timeDiffHours(wo.technicianResponseAt, now);
    case "Pending":
      return timeDiffHours(wo.workOrderCreatedAt, now);
  }
}

const statusColors: Record<WOStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Accepted: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

export default function WorkOrdersPage() {
  const [data, setData] = useState<WORow[]>([]);
  const [filterStatus, setFilterStatus] = useState<WOStatus | "all">("all");
  const [filterTech, setFilterTech] = useState<string>("all");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(
          (results.data as Record<string, string>[]).map((r) => ({
            dspName: r["DSP Name"] || "",
            vehicleFleetId: r["Vehicle Fleet ID"] || "",
            defectDescription: r["Defect Description"] || "",
            defectReportedAt: r["Defect Reported At (EST)"] || "",
            workOrderCreatedAt: r["Work Order Created At (EST)"] || "",
            workApprovedBy: r["Work Approved By"] || "",
            technician: r["Technician"] || "",
            technicianResponseAt: r["Technician Response At (EST)"] || "",
            workOrderAccepted: toBool(r["Work Order Accepted"]),
            workOrderCompletedAt: r["Work Order Completed At (EST)"] || "",
          }))
        );
      },
    });
  };

  const technicians = useMemo(() => {
    const set = new Set(data.map((d) => d.technician).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((wo) => {
      if (filterStatus !== "all" && getStatus(wo) !== filterStatus) return false;
      if (filterTech !== "all" && wo.technician !== filterTech) return false;
      return true;
    });
  }, [data, filterStatus, filterTech]);

  const statusCounts = useMemo(() => {
    const counts: Record<WOStatus, number> = {
      Pending: 0,
      Accepted: 0,
      Completed: 0,
    };
    data.forEach((wo) => {
      counts[getStatus(wo)]++;
    });
    return counts;
  }, [data]);

  // Tech stats
  const techStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; total: number; completed: number; pending: number; accepted: number }
    > = {};
    data.forEach((wo) => {
      const tech = wo.technician || "Unassigned";
      if (!map[tech])
        map[tech] = { name: tech, total: 0, completed: 0, pending: 0, accepted: 0 };
      map[tech].total++;
      const status = getStatus(wo);
      if (status === "Completed") map[tech].completed++;
      else if (status === "Accepted") map[tech].accepted++;
      else map[tech].pending++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div>
      {/* Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-[#1a3a5f]">
          🔧 Work Order Metrics
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm border rounded p-2 flex-1 min-w-[200px]"
          />
          {data.length > 0 && (
            <>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as WOStatus | "all")
                }
                className="border rounded p-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={filterTech}
                onChange={(e) => setFilterTech(e.target.value)}
                className="border rounded p-2 text-sm"
              >
                <option value="all">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t} value={t}>
                    {t.split("@")[0]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">🔧</p>
          <p className="text-gray-500">
            Upload a work orders CSV to see metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Work Orders"
              value={data.length}
              color="#2563eb"
            />
            <StatCard
              title="Pending"
              value={statusCounts.Pending}
              color="#f59e0b"
            />
            <StatCard
              title="Accepted"
              value={statusCounts.Accepted}
              color="#3b82f6"
            />
            <StatCard
              title="Completed"
              value={statusCounts.Completed}
              color="#10b981"
            />
          </div>

          {/* Technician Summary */}
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              Technician Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Technician</th>
                    <th className="pb-2 pr-4 text-right">Total</th>
                    <th className="pb-2 pr-4 text-right">Completed</th>
                    <th className="pb-2 pr-4 text-right">Accepted</th>
                    <th className="pb-2 pr-4 text-right">Pending</th>
                    <th className="pb-2">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {techStats.map((ts) => {
                    const rate =
                      ts.total > 0
                        ? Math.round((ts.completed / ts.total) * 100)
                        : 0;
                    return (
                      <tr
                        key={ts.name}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-4 font-medium">
                          {ts.name.includes("@")
                            ? ts.name.split("@")[0]
                            : ts.name}
                        </td>
                        <td className="py-2 pr-4 text-right">{ts.total}</td>
                        <td className="py-2 pr-4 text-right text-green-600">
                          {ts.completed}
                        </td>
                        <td className="py-2 pr-4 text-right text-blue-600">
                          {ts.accepted}
                        </td>
                        <td className="py-2 pr-4 text-right text-yellow-600">
                          {ts.pending}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-full h-4 max-w-[120px]">
                              <div
                                className="h-4 rounded-full bg-green-500"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Work Orders Table */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              Work Orders
              <span className="text-xs text-gray-400 font-normal ml-2">
                ({filtered.length} records)
              </span>
            </h3>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-3">DSP</th>
                    <th className="pb-2 pr-3">Vehicle</th>
                    <th className="pb-2 pr-3">Defect</th>
                    <th className="pb-2 pr-3">Technician</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Time in Status</th>
                    <th className="pb-2 pr-3 text-xs">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((wo, i) => {
                    const status = getStatus(wo);
                    return (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-3">{wo.dspName}</td>
                        <td className="py-2 pr-3 font-medium">
                          {wo.vehicleFleetId}
                        </td>
                        <td className="py-2 pr-3 max-w-xs">
                          <span className="line-clamp-1 text-xs">
                            {wo.defectDescription}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {wo.technician
                            ? wo.technician.split("@")[0]
                            : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status]}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs font-medium">
                          {timeInStatus(wo)}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-400">
                          {wo.workOrderCreatedAt
                            ? new Date(wo.workOrderCreatedAt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

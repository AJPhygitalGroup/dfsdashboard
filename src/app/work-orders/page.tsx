"use client";

import { useState, useMemo } from "react";
import StatCard from "@/components/StatCard";
import DateRangeFilter from "@/components/DateRangeFilter";
import SyncBanner from "@/components/SyncBanner";
import { useBlobCsv } from "@/lib/use-blob-csv";

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

/** Returns time in status as milliseconds for sorting */
function timeInStatusMs(wo: WORow): number {
  const status = getStatus(wo);
  const now = Date.now();

  let from = "";
  let to = "";
  switch (status) {
    case "Completed":
      from = wo.workOrderCreatedAt;
      to = wo.workOrderCompletedAt;
      break;
    case "Accepted":
      from = wo.technicianResponseAt;
      to = new Date(now).toISOString();
      break;
    case "Pending":
      from = wo.workOrderCreatedAt;
      to = new Date(now).toISOString();
      break;
  }
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return isNaN(diff) || diff < 0 ? 0 : diff;
}

type SortColumn = "dsp" | "time" | "created" | "status" | "none";
type SortDir = "asc" | "desc";

/** Parse a date string to YYYY-MM-DD for comparison */
function toDateKey(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const statusColors: Record<WOStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Accepted: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

export default function WorkOrdersPage() {
  const { rawData, loading, source, syncInfo, handleFileUpload } = useBlobCsv("work_orders");
  const [filterStatus, setFilterStatus] = useState<WOStatus | "all">("all");
  const [filterTech, setFilterTech] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState<SortColumn>("none");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const data: WORow[] = useMemo(() => {
    return rawData.map((r) => ({
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
    }));
  }, [rawData]);

  // All dates for the filter auto-detect
  const allDates = useMemo(
    () => data.map((d) => d.workOrderCreatedAt || d.defectReportedAt),
    [data]
  );

  const technicians = useMemo(() => {
    const set = new Set(data.map((d) => d.technician).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((wo) => {
      if (filterStatus !== "all" && getStatus(wo) !== filterStatus) return false;
      if (filterTech !== "all" && wo.technician !== filterTech) return false;
      // Date range filter (based on work order created date)
      if (dateFrom || dateTo) {
        const dk = toDateKey(wo.workOrderCreatedAt || wo.defectReportedAt);
        if (!dk) return false;
        if (dateFrom && dk < dateFrom) return false;
        if (dateTo && dk > dateTo) return false;
      }
      return true;
    });
  }, [data, filterStatus, filterTech, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    const counts: Record<WOStatus, number> = {
      Pending: 0,
      Accepted: 0,
      Completed: 0,
    };
    filtered.forEach((wo) => {
      counts[getStatus(wo)]++;
    });
    return counts;
  }, [filtered]);

  // Tech stats (use filtered so date range applies)
  const techStats = useMemo(() => {
    const map: Record<
      string,
      { name: string; total: number; completed: number; pending: number; accepted: number }
    > = {};
    filtered.forEach((wo) => {
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
  }, [filtered]);

  // Sortable table data
  const sorted = useMemo(() => {
    if (sortCol === "none") return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      switch (sortCol) {
        case "dsp": {
          const cmp = a.dspName.localeCompare(b.dspName);
          if (cmp !== 0) return cmp * dir;
          // Secondary: fleet ID ascending
          return a.vehicleFleetId.localeCompare(b.vehicleFleetId);
        }
        case "time":
          return (timeInStatusMs(a) - timeInStatusMs(b)) * dir;
        case "created": {
          const da = new Date(a.workOrderCreatedAt || a.defectReportedAt).getTime() || 0;
          const db = new Date(b.workOrderCreatedAt || b.defectReportedAt).getTime() || 0;
          return (da - db) * dir;
        }
        case "status": {
          const order: Record<WOStatus, number> = { Pending: 0, Accepted: 1, Completed: 2 };
          return (order[getStatus(a)] - order[getStatus(b)]) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      // Toggle direction, or reset if already toggled both ways
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir(col === "time" ? "desc" : "asc"); // time defaults desc (oldest first = most stale)
    }
  }

  function sortIcon(col: SortColumn) {
    if (sortCol !== col) return " \u2195"; // ↕
    return sortDir === "asc" ? " \u2191" : " \u2193"; // ↑ or ↓
  }

  return (
    <div>
      {/* Upload & Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3 text-[#1a3a5f]">
          Work Order Metrics
        </h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
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
        {data.length > 0 && (
          <DateRangeFilter
            dates={allDates}
            onRangeChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        )}
        {source === "blob" && (
          <SyncBanner syncTimestamp={syncInfo?.timestamp} />
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">🔧</p>
          <p className="text-gray-500">
            No work order data available. Upload a CSV or wait for the daily email sync.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Work Orders"
              value={filtered.length}
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
          <div className="bg-white rounded-lg shadow p-3 sm:p-5 mb-4 sm:mb-6">
            <h3 className="font-semibold text-[#1a3a5f] mb-3 text-sm sm:text-base">
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
          <div className="bg-white rounded-lg shadow p-3 sm:p-5">
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
                    <th
                      className="pb-2 pr-3 cursor-pointer hover:text-[#1a3a5f] select-none"
                      onClick={() => handleSort("dsp")}
                    >
                      DSP{sortIcon("dsp")}
                    </th>
                    <th className="pb-2 pr-3">Vehicle</th>
                    <th className="pb-2 pr-3">Defect</th>
                    <th className="pb-2 pr-3">Technician</th>
                    <th
                      className="pb-2 pr-3 cursor-pointer hover:text-[#1a3a5f] select-none"
                      onClick={() => handleSort("status")}
                    >
                      Status{sortIcon("status")}
                    </th>
                    <th
                      className="pb-2 pr-3 cursor-pointer hover:text-[#1a3a5f] select-none"
                      onClick={() => handleSort("time")}
                    >
                      Time in Status{sortIcon("time")}
                    </th>
                    <th
                      className="pb-2 pr-3 text-xs cursor-pointer hover:text-[#1a3a5f] select-none"
                      onClick={() => handleSort("created")}
                    >
                      Created{sortIcon("created")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((wo, i) => {
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
                            : "\u2014"}
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

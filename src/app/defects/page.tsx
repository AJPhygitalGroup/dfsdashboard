"use client";

import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import StatCard from "@/components/StatCard";
import { EXCLUDED_DEFECTS } from "@/lib/excluded-defects";
import { useBlobCsv } from "@/lib/use-blob-csv";

interface DefectRow {
  defectReportedAt: string;
  organizationName: string;
  vehicleFleetId: string;
  defectDescription: string;
  reportedBy: string;
  defectWorkApproved: boolean;
  defectWorkAccepted: boolean;
  defectWorkCompleted: boolean;
}

interface WorkOrderRow {
  vehicleFleetId: string;
  defectDescription: string;
}

function toBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.toLowerCase().trim() === "true";
}

export default function DefectsPage() {
  const { rawData: defectsRaw, loading: loadingDefects, source: defectsSource, handleFileUpload: handleDefectsUpload } = useBlobCsv("defects");
  const { rawData: woRaw, loading: loadingWO, handleFileUpload: handleWOUpload } = useBlobCsv("work_orders");

  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);

  // Parse defects from blob/upload raw data
  useEffect(() => {
    if (defectsRaw.length > 0) {
      setDefects(
        defectsRaw.map((r) => ({
          defectReportedAt: r["Defect Reported At"] || "",
          organizationName: r["Organization Name"] || "",
          vehicleFleetId: r["Vehicle Fleet ID"] || "",
          defectDescription: r["Defect Description"] || "",
          reportedBy: r["Reported By"] || "",
          defectWorkApproved: toBool(r["Defect Work Approved"]),
          defectWorkAccepted: toBool(r["Defect Work Accepted"]),
          defectWorkCompleted: toBool(r["Defect Work Completed"]),
        }))
      );
    }
  }, [defectsRaw]);

  // Parse work orders from blob/upload raw data
  useEffect(() => {
    if (woRaw.length > 0) {
      setWorkOrders(
        woRaw.map((r) => ({
          vehicleFleetId: r["Vehicle Fleet ID"] || "",
          defectDescription: r["Defect Description"] || "",
        }))
      );
    }
  }, [woRaw]);

  const handleDefectsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleDefectsUpload(f);
  };

  const handleWorkOrdersFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleWOUpload(f);
  };

  // Build work order lookup set for cross-reference
  const woSet = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((wo) => {
      set.add(`${wo.vehicleFleetId}|||${wo.defectDescription}`);
    });
    return set;
  }, [workOrders]);

  // Filter defects: exclude excluded defects and those that became work orders
  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      // Exclude standard excluded defects
      if (EXCLUDED_DEFECTS.some((ex) => d.defectDescription.includes(ex))) {
        return false;
      }
      // Exclude defects that were converted to work orders (cross-reference)
      if (woSet.has(`${d.vehicleFleetId}|||${d.defectDescription}`)) {
        return false;
      }
      return true;
    });
  }, [defects, woSet]);

  // Group by defect description to count occurrences
  const defectCounts = useMemo(() => {
    const map: Record<
      string,
      {
        description: string;
        count: number;
        reporters: Set<string>;
        vehicles: Set<string>;
      }
    > = {};
    filteredDefects.forEach((d) => {
      if (!map[d.defectDescription]) {
        map[d.defectDescription] = {
          description: d.defectDescription,
          count: 0,
          reporters: new Set(),
          vehicles: new Set(),
        };
      }
      map[d.defectDescription].count++;
      map[d.defectDescription].reporters.add(d.reportedBy);
      map[d.defectDescription].vehicles.add(d.vehicleFleetId);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredDefects]);

  // Per-vehicle defect breakdown
  const vehicleDefects = useMemo(() => {
    const map: Record<
      string,
      {
        vehicleId: string;
        org: string;
        defects: Record<string, number>;
        total: number;
      }
    > = {};
    filteredDefects.forEach((d) => {
      if (!map[d.vehicleFleetId]) {
        map[d.vehicleFleetId] = {
          vehicleId: d.vehicleFleetId,
          org: d.organizationName,
          defects: {},
          total: 0,
        };
      }
      map[d.vehicleFleetId].defects[d.defectDescription] =
        (map[d.vehicleFleetId].defects[d.defectDescription] || 0) + 1;
      map[d.vehicleFleetId].total++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredDefects]);

  // Repetitive defects (same defect reported more than once on same vehicle)
  const repetitiveDefects = useMemo(() => {
    const results: {
      vehicleId: string;
      org: string;
      defect: string;
      count: number;
      reporters: string[];
    }[] = [];
    vehicleDefects.forEach((v) => {
      Object.entries(v.defects).forEach(([defect, count]) => {
        if (count > 1) {
          const reporters = filteredDefects
            .filter(
              (d) =>
                d.vehicleFleetId === v.vehicleId &&
                d.defectDescription === defect
            )
            .map((d) => d.reportedBy);
          results.push({
            vehicleId: v.vehicleId,
            org: v.org,
            defect,
            count,
            reporters: [...new Set(reporters)],
          });
        }
      });
    });
    return results.sort((a, b) => b.count - a.count);
  }, [vehicleDefects, filteredDefects]);

  const excludedByWO = defects.filter((d) =>
    woSet.has(`${d.vehicleFleetId}|||${d.defectDescription}`)
  ).length;

  return (
    <div>
      {/* Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-[#1a3a5f]">
          ⚠️ Defect Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Defects CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleDefectsFile}
              className="block w-full text-sm border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Work Orders CSV{" "}
              <span className="text-gray-400 font-normal">
                (for cross-reference)
              </span>
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleWorkOrdersFile}
              className="block w-full text-sm border rounded p-2"
            />
          </div>
        </div>
        {defectsSource === "blob" && (
          <p className="text-xs text-green-600 mt-2">Data loaded automatically from latest email report</p>
        )}
      </div>

      {(loadingDefects || loadingWO) ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading data...</p>
        </div>
      ) : defects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-500">
            No defect data available. Upload a CSV or wait for the daily email sync.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Defects (raw)"
              value={defects.length}
              color="#6b7280"
            />
            <StatCard
              title="Excluded (Work Orders)"
              value={excludedByWO}
              color="#8b5cf6"
            />
            <StatCard
              title="Active Defects"
              value={filteredDefects.length}
              subtitle="Not addressed"
              color="#f59e0b"
            />
            <StatCard
              title="Repetitive Defects"
              value={repetitiveDefects.length}
              subtitle="Same defect, same vehicle"
              color="#ef4444"
            />
          </div>

          {/* Defect Frequency */}
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              Defect Frequency
              <span className="text-xs text-gray-400 font-normal ml-2">
                (how many times each defect was reported)
              </span>
            </h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Defect Description</th>
                    <th className="pb-2 pr-4 text-right">Times Reported</th>
                    <th className="pb-2 pr-4 text-right">Vehicles Affected</th>
                    <th className="pb-2">Reported By</th>
                  </tr>
                </thead>
                <tbody>
                  {defectCounts.map((dc, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-2 pr-4 max-w-md">
                        <span className="line-clamp-2">
                          {dc.description}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            dc.count >= 5
                              ? "bg-red-100 text-red-700"
                              : dc.count >= 3
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {dc.count}x
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{dc.vehicles.size}</td>
                      <td className="py-2 text-xs text-gray-500">
                        {[...dc.reporters].slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 mr-1 mb-0.5"
                          >
                            {r.split("@")[0]}
                          </span>
                        ))}
                        {dc.reporters.size > 3 && (
                          <span className="text-gray-400">
                            +{dc.reporters.size - 3} more
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Repetitive Defects */}
          {repetitiveDefects.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5 mb-6">
              <h3 className="font-semibold text-red-600 mb-3">
                Repetitive Defects Per Vehicle
                <span className="text-xs text-gray-400 font-normal ml-2">
                  (same defect reported multiple times - not addressed)
                </span>
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4">Organization</th>
                      <th className="pb-2 pr-4">Vehicle</th>
                      <th className="pb-2 pr-4">Defect</th>
                      <th className="pb-2 pr-4 text-right">Occurrences</th>
                      <th className="pb-2">Reported By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repetitiveDefects.map((rd, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-red-50"
                      >
                        <td className="py-2 pr-4">{rd.org}</td>
                        <td className="py-2 pr-4 font-medium">{rd.vehicleId}</td>
                        <td className="py-2 pr-4 max-w-sm">
                          <span className="line-clamp-2">{rd.defect}</span>
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            {rd.count}x
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {rd.reporters.map((r) => (
                            <span
                              key={r}
                              className="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 mr-1"
                            >
                              {r.split("@")[0]}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-Vehicle Defects */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              Defects Per Vehicle
            </h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Vehicle</th>
                    <th className="pb-2 pr-4 text-right">Total Defects</th>
                    <th className="pb-2">Top Defect</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleDefects.slice(0, 50).map((v, i) => {
                    const topDefect = Object.entries(v.defects).sort(
                      (a, b) => b[1] - a[1]
                    )[0];
                    return (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-2 pr-4">{v.org}</td>
                        <td className="py-2 pr-4 font-medium">{v.vehicleId}</td>
                        <td className="py-2 pr-4 text-right font-bold">
                          {v.total}
                        </td>
                        <td className="py-2 text-xs text-gray-500 max-w-sm">
                          <span className="line-clamp-1">
                            {topDefect
                              ? `${topDefect[0]} (${topDefect[1]}x)`
                              : "-"}
                          </span>
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

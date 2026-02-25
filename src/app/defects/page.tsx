"use client";

import { useState, useMemo, useEffect } from "react";
import StatCard from "@/components/StatCard";
import DateRangeFilter from "@/components/DateRangeFilter";
import { EXCLUDED_DEFECTS } from "@/lib/excluded-defects";
import SyncBanner from "@/components/SyncBanner";
import { useBlobCsv } from "@/lib/use-blob-csv";
import { useAuth } from "@/components/AuthProvider";

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

export default function DefectsPage() {
  const { rawData: defectsRaw, loading: loadingDefects, source: defectsSource, syncInfo, handleFileUpload: handleDefectsUpload } = useBlobCsv("defects");
  const { rawData: woRaw, loading: loadingWO, handleFileUpload: handleWOUpload } = useBlobCsv("work_orders");
  const { user } = useAuth();

  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showNotAddressed, setShowNotAddressed] = useState(false);
  const [selectedDefectTypes, setSelectedDefectTypes] = useState<Set<string>>(new Set());
  const [defectFilterOpen, setDefectFilterOpen] = useState(false);
  const [defectSearch, setDefectSearch] = useState("");

  // Parse defects from blob/upload raw data, filter by DSP if user is restricted
  useEffect(() => {
    if (defectsRaw.length > 0) {
      const parsed = defectsRaw.map((r) => ({
        defectReportedAt: r["Defect Reported At"] || "",
        organizationName: r["Organization Name"] || "",
        vehicleFleetId: r["Vehicle Fleet ID"] || "",
        defectDescription: r["Defect Description"] || "",
        reportedBy: r["Reported By"] || "",
        defectWorkApproved: toBool(r["Defect Work Approved"]),
        defectWorkAccepted: toBool(r["Defect Work Accepted"]),
        defectWorkCompleted: toBool(r["Defect Work Completed"]),
      }));
      setDefects(user?.dsp ? parsed.filter((d) => d.organizationName === user.dsp) : parsed);
    }
  }, [defectsRaw, user?.dsp]);

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

  // All dates for the filter auto-detect
  const allDates = useMemo(() => defects.map((d) => d.defectReportedAt), [defects]);

  // Build work order lookup set for cross-reference
  const woSet = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((wo) => {
      set.add(`${wo.vehicleFleetId}|||${wo.defectDescription}`);
    });
    return set;
  }, [workOrders]);

  // Date-filtered defects (before exclusion logic)
  const dateFilteredDefects = useMemo(() => {
    if (!dateFrom && !dateTo) return defects;
    return defects.filter((d) => {
      const dk = toDateKey(d.defectReportedAt);
      if (!dk) return false;
      if (dateFrom && dk < dateFrom) return false;
      if (dateTo && dk > dateTo) return false;
      return true;
    });
  }, [defects, dateFrom, dateTo]);

  // Filter defects: exclude excluded defects and those that became work orders
  const filteredDefects = useMemo(() => {
    return dateFilteredDefects.filter((d) => {
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
  }, [dateFilteredDefects, woSet]);

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

  // Unique defect descriptions for the filter (sorted by frequency)
  const uniqueDefectTypes = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDefects.forEach((d) => {
      map[d.defectDescription] = (map[d.defectDescription] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([desc, count]) => ({ description: desc, count }));
  }, [filteredDefects]);

  // Initialize selectedDefectTypes with all when data first loads
  useEffect(() => {
    if (uniqueDefectTypes.length > 0 && selectedDefectTypes.size === 0) {
      setSelectedDefectTypes(new Set(uniqueDefectTypes.map((d) => d.description)));
    }
  }, [uniqueDefectTypes]);

  // Not-addressed defects: full detail list grouped by org > vehicle > defect
  const notAddressedList = useMemo(() => {
    // Group: org → vehicle → defect → count + reporters
    const orgMap: Record<
      string,
      Record<
        string,
        {
          defects: Record<string, { count: number; reporters: Set<string>; dates: string[] }>;
        }
      >
    > = {};

    filteredDefects.forEach((d) => {
      const org = d.organizationName || "Unknown";
      const vid = d.vehicleFleetId || "Unknown";
      if (!orgMap[org]) orgMap[org] = {};
      if (!orgMap[org][vid]) orgMap[org][vid] = { defects: {} };
      if (!orgMap[org][vid].defects[d.defectDescription]) {
        orgMap[org][vid].defects[d.defectDescription] = { count: 0, reporters: new Set(), dates: [] };
      }
      orgMap[org][vid].defects[d.defectDescription].count++;
      orgMap[org][vid].defects[d.defectDescription].reporters.add(d.reportedBy);
      orgMap[org][vid].defects[d.defectDescription].dates.push(d.defectReportedAt);
    });

    // Flatten to a sortable array
    const rows: {
      org: string;
      vehicle: string;
      defect: string;
      count: number;
      reporters: string[];
      lastReported: string;
    }[] = [];

    Object.entries(orgMap).forEach(([org, vehicles]) => {
      Object.entries(vehicles).forEach(([vehicle, data]) => {
        Object.entries(data.defects).forEach(([defect, info]) => {
          const sortedDates = info.dates.sort();
          rows.push({
            org,
            vehicle,
            defect,
            count: info.count,
            reporters: [...info.reporters],
            lastReported: sortedDates[sortedDates.length - 1] || "",
          });
        });
      });
    });

    return rows.sort((a, b) => b.count - a.count);
  }, [filteredDefects]);

  // Apply defect type filter to the not-addressed list
  const filteredNotAddressedList = useMemo(() => {
    if (selectedDefectTypes.size === 0 || selectedDefectTypes.size === uniqueDefectTypes.length) {
      return notAddressedList;
    }
    return notAddressedList.filter((row) => selectedDefectTypes.has(row.defect));
  }, [notAddressedList, selectedDefectTypes, uniqueDefectTypes.length]);

  // Count for the filtered view
  const filteredNotAddressedCount = useMemo(() => {
    return filteredNotAddressedList.reduce((sum, row) => sum + row.count, 0);
  }, [filteredNotAddressedList]);

  const excludedByWO = dateFilteredDefects.filter((d) =>
    woSet.has(`${d.vehicleFleetId}|||${d.defectDescription}`)
  ).length;

  return (
    <div>
      {/* Upload */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3 text-[#1a3a5f]">
          Defect Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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
        {defects.length > 0 && (
          <DateRangeFilter
            dates={allDates}
            onRangeChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        )}
        {defectsSource === "blob" && (
          <SyncBanner syncTimestamp={syncInfo?.timestamp} />
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
              value={dateFilteredDefects.length}
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

          {/* NOT ADDRESSED - Full Detail Table */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-amber-600 text-sm sm:text-base">
                Defects Not Addressed
                <span className="text-xs text-gray-400 font-normal ml-2">
                  ({filteredNotAddressedCount} defects on {filteredNotAddressedList.length} entries
                  {selectedDefectTypes.size < uniqueDefectTypes.length && ` \u2014 filtered`})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setDefectFilterOpen(!defectFilterOpen)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      selectedDefectTypes.size < uniqueDefectTypes.length
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Filter Defects ({selectedDefectTypes.size}/{uniqueDefectTypes.length})
                  </button>
                  {defectFilterOpen && (
                    <>
                      {/* Mobile: backdrop overlay */}
                      <div
                        className="sm:hidden fixed inset-0 bg-black/30 z-40"
                        onClick={() => { setDefectFilterOpen(false); setDefectSearch(""); }}
                      />
                      {/* Dropdown panel: fixed centered on mobile, absolute on desktop */}
                      <div className="fixed inset-x-3 top-[15vh] z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1 bg-white border border-gray-200 rounded-lg shadow-lg sm:w-[400px] max-h-[70vh] sm:max-h-[400px] flex flex-col">
                        {/* Search */}
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            placeholder="Search defects..."
                            value={defectSearch}
                            onChange={(e) => setDefectSearch(e.target.value)}
                            className="w-full border rounded p-1.5 text-xs"
                          />
                        </div>
                        {/* Select all / none */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
                          <button
                            onClick={() => setSelectedDefectTypes(new Set(uniqueDefectTypes.map((d) => d.description)))}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => setSelectedDefectTypes(new Set())}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        {/* Checkbox list */}
                        <div className="overflow-y-auto flex-1 p-1">
                          {uniqueDefectTypes
                            .filter((d) =>
                              defectSearch
                                ? d.description.toLowerCase().includes(defectSearch.toLowerCase())
                                : true
                            )
                            .map((d) => (
                              <label
                                key={d.description}
                                className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDefectTypes.has(d.description)}
                                  onChange={() => {
                                    const next = new Set(selectedDefectTypes);
                                    if (next.has(d.description)) {
                                      next.delete(d.description);
                                    } else {
                                      next.add(d.description);
                                    }
                                    setSelectedDefectTypes(next);
                                  }}
                                  className="mt-0.5 rounded"
                                />
                                <span className="text-xs text-gray-700 leading-tight flex-1">
                                  {d.description}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                  {d.count}x
                                </span>
                              </label>
                            ))}
                        </div>
                        {/* Close */}
                        <div className="p-2 border-t bg-gray-50 flex justify-end">
                          <button
                            onClick={() => { setDefectFilterOpen(false); setDefectSearch(""); }}
                            className="text-xs bg-[#1a3a5f] text-white px-3 py-1.5 rounded hover:bg-[#0f2a4a]"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowNotAddressed(!showNotAddressed)}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded hover:bg-amber-100 transition-colors"
                >
                  {showNotAddressed ? "Hide Details" : "Show All Details"}
                </button>
              </div>
            </div>

            {showNotAddressed && (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-3">Organization</th>
                      <th className="pb-2 pr-3">Vehicle</th>
                      <th className="pb-2 pr-3">Defect Description</th>
                      <th className="pb-2 pr-3 text-right">Times Reported</th>
                      <th className="pb-2 pr-3">Reported By</th>
                      <th className="pb-2 pr-3">Last Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotAddressedList.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-0 hover:bg-amber-50"
                      >
                        <td className="py-2 pr-3 text-xs">{row.org}</td>
                        <td className="py-2 pr-3 font-medium text-xs">{row.vehicle}</td>
                        <td className="py-2 pr-3 max-w-sm">
                          <span className="line-clamp-2 text-xs">{row.defect}</span>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                              row.count >= 5
                                ? "bg-red-100 text-red-700"
                                : row.count >= 3
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {row.count}x
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {row.reporters.slice(0, 2).map((r) => (
                            <span
                              key={r}
                              className="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 mr-1 mb-0.5"
                            >
                              {r.split("@")[0]}
                            </span>
                          ))}
                          {row.reporters.length > 2 && (
                            <span className="text-gray-400">
                              +{row.reporters.length - 2}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-400">
                          {row.lastReported
                            ? new Date(row.lastReported).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredNotAddressedList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400 text-sm">
                          No defects match the current filter. Adjust the defect filter above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!showNotAddressed && (
              <p className="text-sm text-gray-500">
                Click &quot;Show All Details&quot; to see every not-addressed defect with vehicle, company, reporter, and how many times it was reported.
              </p>
            )}
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

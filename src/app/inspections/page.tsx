"use client";

import { useState, useMemo } from "react";
import StatCard from "@/components/StatCard";
import { useBlobCsv } from "@/lib/use-blob-csv";

interface InspectionRow {
  dspName: string;
  vehicleFleetId: string;
  startTime: string;
  endTime: string;
  timeTakenSeconds: number;
  timeTakenFormatted: string;
}

function parseDuration(duration: string): number {
  const parts = duration.split(":");
  if (parts.length !== 3) return 0;
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
}

function formatDur(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export default function InspectionsPage() {
  const { rawData, loading, source, handleFileUpload } = useBlobCsv("inspections");
  const [selectedDsp, setSelectedDsp] = useState<string>("all");

  const data: InspectionRow[] = useMemo(() => {
    return rawData.map((r) => {
      const secs = parseDuration(r["Time Taken"] || "0:00:00");
      return {
        dspName: r["DSP Name"] || "",
        vehicleFleetId: r["Vehicle Fleet ID"] || "",
        startTime: r["Start Time (EST)"] || "",
        endTime: r["End Time (EST)"] || "",
        timeTakenSeconds: secs,
        timeTakenFormatted: formatDur(secs),
      };
    });
  }, [rawData]);

  const dspNames = useMemo(() => {
    const set = new Set(data.map((d) => d.dspName));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (selectedDsp === "all") return data;
    return data.filter((d) => d.dspName === selectedDsp);
  }, [data, selectedDsp]);

  const totalVehicles = filtered.length;
  const avgTime = totalVehicles > 0
    ? filtered.reduce((sum, d) => sum + d.timeTakenSeconds, 0) / totalVehicles
    : 0;

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.timeTakenSeconds - a.timeTakenSeconds),
    [filtered]
  );

  const slowest3 = sorted.slice(0, 3);
  const fastest3 = sorted.slice(-3).reverse();

  // Per-DSP stats
  const dspStats = useMemo(() => {
    const map: Record<string, { count: number; totalTime: number }> = {};
    data.forEach((d) => {
      if (!map[d.dspName]) map[d.dspName] = { count: 0, totalTime: 0 };
      map[d.dspName].count++;
      map[d.dspName].totalTime += d.timeTakenSeconds;
    });
    return Object.entries(map)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div>
      {/* Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-[#1a3a5f]">
          🔍 Inspection Metrics
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
            className="block text-sm border rounded p-2 flex-1"
          />
          {data.length > 0 && (
            <select
              value={selectedDsp}
              onChange={(e) => setSelectedDsp(e.target.value)}
              className="border rounded p-2 text-sm"
            >
              <option value="all">All DSPs</option>
              {dspNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        {source === "blob" && (
          <p className="text-xs text-green-600 mt-2">Data loaded automatically from latest email report</p>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">
            No inspection data available. Upload a CSV or wait for the daily email sync.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Vehicles Inspected"
              value={totalVehicles}
              subtitle={selectedDsp !== "all" ? selectedDsp : "All DSPs"}
              color="#2563eb"
            />
            <StatCard
              title="Average Inspection Time"
              value={formatDur(avgTime)}
              color="#10b981"
            />
            <StatCard
              title="Total DSPs"
              value={dspNames.length}
              color="#8b5cf6"
            />
          </div>

          {/* Slowest & Fastest */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Slowest */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-red-600 mb-3">
                🐢 Top 3 Slowest Inspections
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">Vehicle</th>
                    <th className="pb-2">DSP</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {slowest3.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.vehicleFleetId}</td>
                      <td className="py-2 text-gray-600">{row.dspName}</td>
                      <td className="py-2 text-right text-red-600 font-semibold">
                        {row.timeTakenFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fastest */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-green-600 mb-3">
                🐇 Top 3 Fastest Inspections
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">Vehicle</th>
                    <th className="pb-2">DSP</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {fastest3.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{row.vehicleFleetId}</td>
                      <td className="py-2 text-gray-600">{row.dspName}</td>
                      <td className="py-2 text-right text-green-600 font-semibold">
                        {row.timeTakenFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DSP Benchmark Table */}
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              DSP Benchmark
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">DSP Name</th>
                    <th className="pb-2 text-right">Vehicles</th>
                    <th className="pb-2 text-right">Avg Time</th>
                    <th className="pb-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {dspStats.map((stat) => {
                    const barWidth = Math.min(
                      (stat.avgTime / (avgTime * 2)) * 100,
                      100
                    );
                    const color =
                      stat.avgTime <= avgTime ? "#10b981" : "#ef4444";
                    return (
                      <tr key={stat.name} className="border-b last:border-0">
                        <td className="py-2 font-medium">{stat.name}</td>
                        <td className="py-2 text-right">{stat.count}</td>
                        <td className="py-2 text-right">
                          {formatDur(stat.avgTime)}
                        </td>
                        <td className="py-2">
                          <div className="w-full bg-gray-100 rounded-full h-4">
                            <div
                              className="h-4 rounded-full"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Inspection Table */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-[#1a3a5f] mb-3">
              All Inspections
              <span className="text-xs text-gray-400 font-normal ml-2">
                ({filtered.length} records)
              </span>
            </h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">DSP</th>
                    <th className="pb-2 pr-4">Vehicle</th>
                    <th className="pb-2 pr-4">Start</th>
                    <th className="pb-2 pr-4">End</th>
                    <th className="pb-2 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-1.5 pr-4 text-gray-400">{i + 1}</td>
                      <td className="py-1.5 pr-4">{row.dspName}</td>
                      <td className="py-1.5 pr-4 font-medium">
                        {row.vehicleFleetId}
                      </td>
                      <td className="py-1.5 pr-4 text-gray-500 text-xs">
                        {row.startTime.split(" ")[1]?.substring(0, 8) || ""}
                      </td>
                      <td className="py-1.5 pr-4 text-gray-500 text-xs">
                        {row.endTime.split(" ")[1]?.substring(0, 8) || ""}
                      </td>
                      <td className="py-1.5 text-right font-medium">
                        {row.timeTakenFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

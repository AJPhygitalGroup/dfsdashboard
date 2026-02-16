"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import StatCard from "@/components/StatCard";
import type {
  InspectionRecord,
  DefectRecord,
  WorkOrderRecord,
} from "@/lib/types";

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

function toBool(v: string | undefined | null): boolean {
  if (!v) return false;
  return v.toLowerCase().trim() === "true";
}

export default function OverviewPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);

  const handleInspections = (data: Record<string, string>[]) => {
    setInspections(
      data.map((r) => {
        const secs = parseDuration(r["Time Taken"] || "0:00:00");
        return {
          dspName: r["DSP Name"] || "",
          vehicleFleetId: r["Vehicle Fleet ID"] || "",
          startTime: r["Start Time (EST)"] || "",
          endTime: r["End Time (EST)"] || "",
          timeTakenSeconds: secs,
          timeTakenFormatted: formatDur(secs),
        };
      })
    );
  };

  const handleDefects = (data: Record<string, string>[]) => {
    setDefects(
      data.map((r) => ({
        defectReportedAt: r["Defect Reported At"] || "",
        organizationName: r["Organization Name"] || "",
        vehicleFleetId: r["Vehicle Fleet ID"] || "",
        defectDescription: r["Defect Description"] || "",
        reportedBy: r["Reported By"] || "",
        defectAcknowledged: toBool(r["Defect Acknowledged"]),
        defectWorkApproved: toBool(r["Defect Work Approved"]),
        defectWorkAccepted: toBool(r["Defect Work Accepted"]),
        defectWorkCompleted: toBool(r["Defect Work Completed"]),
        defectRejectedReason: r["Defect Rejected Reason"] || "",
      }))
    );
  };

  const handleWorkOrders = (data: Record<string, string>[]) => {
    setWorkOrders(
      data.map((r) => ({
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
  };

  const completedWO = workOrders.filter((wo) => wo.workOrderCompletedAt).length;
  const acceptedWO = workOrders.filter((wo) => wo.workOrderAccepted).length;
  const pendingWO = workOrders.filter(
    (wo) => !wo.workOrderAccepted && !wo.workOrderCompletedAt
  ).length;

  const hasData =
    inspections.length > 0 || defects.length > 0 || workOrders.length > 0;

  return (
    <div>
      <FileUploader
        onInspectionsLoaded={handleInspections}
        onDefectsLoaded={handleDefects}
        onWorkOrdersLoaded={handleWorkOrders}
      />

      {hasData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Vehicles Inspected"
              value={inspections.length}
              color="#2563eb"
            />
            <StatCard
              title="Defects Reported"
              value={defects.length}
              color="#f59e0b"
            />
            <StatCard
              title="Work Orders"
              value={workOrders.length}
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

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-[#1a3a5f]">
              Quick Summary
            </h2>
            <p className="text-sm text-gray-600">
              Navigate to the <strong>Inspections</strong>,{" "}
              <strong>Defects</strong>, or <strong>Work Orders</strong> tabs for
              detailed analysis. Each tab has its own CSV upload for specific
              metrics and charts.
            </p>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <h2 className="text-xl font-semibold text-[#1a3a5f] mb-2">
            Welcome to DFS Fleet Metrics
          </h2>
          <p className="text-gray-500 mb-4">
            Upload your CSV files above, or navigate to a specific dashboard tab
            to get started.
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

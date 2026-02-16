import Papa from "papaparse";
import type {
  InspectionRecord,
  DefectRecord,
  WorkOrderRecord,
} from "./types";

function parseDuration(duration: string): number {
  // Format: "H:MM:SS.microseconds"
  const parts = duration.split(":");
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function toBool(value: string | undefined | null): boolean {
  if (!value) return false;
  const str = value.toLowerCase().trim();
  return str === "true" || str === "yes" || str === "1";
}

export function parseInspectionCSV(csvText: string): InspectionRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row) => {
    const timeTaken = row["Time Taken"] || "0:00:00";
    const seconds = parseDuration(timeTaken);
    return {
      dspName: row["DSP Name"] || "",
      vehicleFleetId: row["Vehicle Fleet ID"] || "",
      startTime: row["Start Time (EST)"] || "",
      endTime: row["End Time (EST)"] || "",
      timeTakenSeconds: seconds,
      timeTakenFormatted: formatDuration(seconds),
    };
  });
}

export function parseDefectsCSV(csvText: string): DefectRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row) => ({
    defectReportedAt: row["Defect Reported At"] || "",
    organizationName: row["Organization Name"] || "",
    vehicleFleetId: row["Vehicle Fleet ID"] || "",
    defectDescription: row["Defect Description"] || "",
    reportedBy: row["Reported By"] || "",
    defectAcknowledged: toBool(row["Defect Acknowledged"]),
    defectWorkApproved: toBool(row["Defect Work Approved"]),
    defectWorkAccepted: toBool(row["Defect Work Accepted"]),
    defectWorkCompleted: toBool(row["Defect Work Completed"]),
    defectRejectedReason: row["Defect Rejected Reason"] || "",
  }));
}

export function parseWorkOrdersCSV(csvText: string): WorkOrderRecord[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row) => ({
    dspName: row["DSP Name"] || "",
    vehicleFleetId: row["Vehicle Fleet ID"] || "",
    defectDescription: row["Defect Description"] || "",
    defectReportedAt: row["Defect Reported At (EST)"] || "",
    workOrderCreatedAt: row["Work Order Created At (EST)"] || "",
    workApprovedBy: row["Work Approved By"] || "",
    technician: row["Technician"] || "",
    technicianResponseAt: row["Technician Response At (EST)"] || "",
    workOrderAccepted: toBool(row["Work Order Accepted"]),
    workOrderCompletedAt: row["Work Order Completed At (EST)"] || "",
  }));
}

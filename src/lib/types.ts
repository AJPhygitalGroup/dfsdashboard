export interface InspectionRecord {
  dspName: string;
  vehicleFleetId: string;
  startTime: string;
  endTime: string;
  timeTakenSeconds: number;
  timeTakenFormatted: string;
}

export interface DefectRecord {
  defectReportedAt: string;
  organizationName: string;
  vehicleFleetId: string;
  defectDescription: string;
  reportedBy: string;
  defectAcknowledged: boolean;
  defectWorkApproved: boolean;
  defectWorkAccepted: boolean;
  defectWorkCompleted: boolean;
  defectRejectedReason: string;
}

export interface WorkOrderRecord {
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

export type WorkOrderStatus = "Pending" | "Accepted" | "Completed";

export interface DashboardData {
  inspections: InspectionRecord[];
  defects: DefectRecord[];
  workOrders: WorkOrderRecord[];
  lastUpdated: string;
}

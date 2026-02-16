import type { DashboardData } from "./types";

// In-memory store for the dashboard data (persists across requests in dev, resets on deploy)
// For production, you'd use a database or file storage
let dashboardData: DashboardData = {
  inspections: [],
  defects: [],
  workOrders: [],
  lastUpdated: "",
};

export function getDashboardData(): DashboardData {
  return dashboardData;
}

export function setDashboardData(data: Partial<DashboardData>): void {
  dashboardData = {
    ...dashboardData,
    ...data,
    lastUpdated: new Date().toISOString(),
  };
}

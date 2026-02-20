import { NextRequest, NextResponse } from "next/server";
import {
  parseInspectionCSV,
  parseDefectsCSV,
  parseWorkOrdersCSV,
} from "@/lib/parse-csv";
import { setDashboardData, getDashboardData } from "@/lib/store";

// API key for the email agent (set in Vercel env vars)
const API_KEY = process.env.UPLOAD_API_KEY;

function validateApiKey(request: NextRequest): boolean {
  // Fail closed: if env var is not configured, deny all access
  if (!API_KEY) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === API_KEY;
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const type = formData.get("type") as string;
    const file = formData.get("file") as File;

    if (!type || !file) {
      return NextResponse.json(
        { error: "Missing 'type' or 'file' field" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    switch (type) {
      case "inspections":
        setDashboardData({ inspections: parseInspectionCSV(csvText) });
        break;
      case "defects":
        setDashboardData({ defects: parseDefectsCSV(csvText) });
        break;
      case "work_orders":
        setDashboardData({ workOrders: parseWorkOrdersCSV(csvText) });
        break;
      default:
        return NextResponse.json(
          { error: "Invalid type. Use: inspections, defects, work_orders" },
          { status: 400 }
        );
    }

    const data = getDashboardData();
    return NextResponse.json({
      success: true,
      message: `${type} data uploaded successfully`,
      counts: {
        inspections: data.inspections.length,
        defects: data.defects.length,
        workOrders: data.workOrders.length,
      },
      lastUpdated: data.lastUpdated,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = getDashboardData();
  return NextResponse.json({
    counts: {
      inspections: data.inspections.length,
      defects: data.defects.length,
      workOrders: data.workOrders.length,
    },
    lastUpdated: data.lastUpdated,
  });
}

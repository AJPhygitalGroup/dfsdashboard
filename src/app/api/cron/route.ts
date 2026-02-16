import { NextRequest, NextResponse } from "next/server";
import { fetchTodaysCsvEmails } from "@/lib/gmail";
import {
  parseInspectionCSV,
  parseDefectsCSV,
  parseWorkOrdersCSV,
} from "@/lib/parse-csv";
import { setDashboardData } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for Gmail API calls

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Starting email fetch...");

    const result = await fetchTodaysCsvEmails();

    console.log(
      `[CRON] Found ${result.attachments.length} CSV attachments from ${result.emailsProcessed} emails`
    );

    let inspectionsCount = 0;
    let defectsCount = 0;
    let workOrdersCount = 0;

    for (const attachment of result.attachments) {
      console.log(
        `[CRON] Processing: ${attachment.filename} (type: ${attachment.type})`
      );

      switch (attachment.type) {
        case "inspections": {
          const data = parseInspectionCSV(attachment.data);
          setDashboardData({ inspections: data });
          inspectionsCount = data.length;
          console.log(`[CRON] Loaded ${data.length} inspection records`);
          break;
        }
        case "defects": {
          const data = parseDefectsCSV(attachment.data);
          setDashboardData({ defects: data });
          defectsCount = data.length;
          console.log(`[CRON] Loaded ${data.length} defect records`);
          break;
        }
        case "work_orders": {
          const data = parseWorkOrdersCSV(attachment.data);
          setDashboardData({ workOrders: data });
          workOrdersCount = data.length;
          console.log(`[CRON] Loaded ${data.length} work order records`);
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      emailsProcessed: result.emailsProcessed,
      attachmentsFound: result.attachments.length,
      records: {
        inspections: inspectionsCount,
        defects: defectsCount,
        workOrders: workOrdersCount,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `${error}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

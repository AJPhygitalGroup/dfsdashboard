import { NextRequest, NextResponse } from "next/server";
import { fetchTodaysCsvEmails } from "@/lib/gmail";
import { insertCsvUpload, type CsvType } from "@/lib/csv-uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const testKey = request.nextUrl.searchParams.get("key");

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    testKey === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Starting email fetch...");

    const result = await fetchTodaysCsvEmails();

    console.log(
      `[CRON] Found ${result.attachments.length} CSV attachments from ${result.emailsProcessed} emails`
    );

    const savedTypes: string[] = [];

    for (const attachment of result.attachments) {
      if (!VALID_TYPES.includes(attachment.type as CsvType)) {
        console.log(`[CRON] Skipping unknown type: ${attachment.type}`);
        continue;
      }

      console.log(
        `[CRON] Saving to DB: ${attachment.filename} (type: ${attachment.type})`
      );

      const recordCount = attachment.data.split("\n").filter((l: string) => l.trim()).length - 1;

      await insertCsvUpload({
        type: attachment.type as CsvType,
        fileName: attachment.filename,
        content: attachment.data,
        recordCount: Math.max(0, recordCount),
        uploadedBy: null,
        uploadSource: "email-sync",
        fileSizeBytes: attachment.data.length,
      });

      savedTypes.push(attachment.type);
      console.log(`[CRON] Saved ${attachment.type}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      emailsProcessed: result.emailsProcessed,
      attachmentsFound: result.attachments.length,
      savedTypes,
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

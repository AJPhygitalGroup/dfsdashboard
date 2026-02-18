import { NextRequest, NextResponse } from "next/server";
import { fetchTodaysCsvEmails } from "@/lib/gmail";
import { saveCsvToBlob, saveSyncMetadata, type CsvType } from "@/lib/blob-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or has the test key
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

    const savedUrls: Record<string, string> = {};

    for (const attachment of result.attachments) {
      console.log(
        `[CRON] Saving to Blob: ${attachment.filename} (type: ${attachment.type})`
      );

      const url = await saveCsvToBlob(
        attachment.type as CsvType,
        attachment.data
      );
      savedUrls[attachment.type] = url;

      console.log(`[CRON] Saved ${attachment.type} → ${url}`);
    }

    // Save sync metadata so the dashboard can show when data was last updated
    if (result.attachments.length > 0) {
      await saveSyncMetadata({
        timestamp: new Date().toISOString(),
        emailsProcessed: result.emailsProcessed,
        attachmentsFound: result.attachments.length,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      emailsProcessed: result.emailsProcessed,
      attachmentsFound: result.attachments.length,
      savedUrls,
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

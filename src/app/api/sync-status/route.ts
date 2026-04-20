import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to verify Gmail sync configuration.
 * Returns whether each required env var is set (without revealing values).
 * Only accessible with CRON_SECRET.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envs = {
    CRON_SECRET: !!process.env.CRON_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "(default: oauth playground)",
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
  };

  const allGmailConfigured =
    envs.GOOGLE_CLIENT_ID && envs.GOOGLE_CLIENT_SECRET && envs.GOOGLE_REFRESH_TOKEN;

  return NextResponse.json({
    gmailConfigured: allGmailConfigured,
    cronEndpoint: "/api/cron",
    cronSchedule: "0 12 * * * (daily at 12:00 UTC = 7am EST / 8am EDT)",
    envs,
    nextSteps: allGmailConfigured
      ? ["Hit /api/cron?key=YOUR_CRON_SECRET to test manually"]
      : [
          "Set missing Gmail env vars in Vercel (see guide)",
          "Get refresh token via https://developers.google.com/oauthplayground",
        ],
  });
}

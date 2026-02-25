import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const testKey = request.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || testKey !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://developers.google.com/oauthplayground";

  // Show partial values so we can verify they're loaded (hide most for security)
  const mask = (val: string) =>
    val.length > 8
      ? `${val.substring(0, 6)}...${val.substring(val.length - 4)} (${val.length} chars)`
      : val
        ? `SET (${val.length} chars)`
        : "EMPTY";

  const envCheck = {
    GOOGLE_CLIENT_ID: mask(clientId),
    GOOGLE_CLIENT_SECRET: mask(clientSecret),
    GOOGLE_REFRESH_TOKEN: mask(refreshToken),
    GOOGLE_REDIRECT_URI: redirectUri,
    CRON_SECRET: cronSecret ? "SET" : "EMPTY",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "SET" : "EMPTY",
  };

  // Now try to actually get an access token
  let tokenResult: string;
  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    tokenResult = credentials.access_token
      ? `SUCCESS - got access token (expires: ${credentials.expiry_date})`
      : "FAILED - no access token returned";
  } catch (err: unknown) {
    const error = err as Error & { response?: { data?: unknown } };
    tokenResult = `FAILED - ${error.message}`;
    if (error.response?.data) {
      tokenResult += ` | Details: ${JSON.stringify(error.response.data)}`;
    }
  }

  return NextResponse.json({
    envCheck,
    tokenTest: tokenResult,
    timestamp: new Date().toISOString(),
  });
}

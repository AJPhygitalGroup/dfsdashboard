import { google } from "googleapis";

const SENDER_EMAIL = "inbox@nova4a.com";

// File name patterns to identify each CSV type
const FILE_PATTERNS: Record<string, string> = {
  inspection: "inspections",
  reported_defects: "defects",
  work_orders: "work_orders",
};

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

interface CsvAttachment {
  type: string; // "inspections" | "defects" | "work_orders"
  filename: string;
  data: string; // CSV text content
}

function identifyCsvType(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [pattern, type] of Object.entries(FILE_PATTERNS)) {
    if (lower.includes(pattern)) return type;
  }
  return null;
}

export async function fetchTodaysCsvEmails(): Promise<{
  attachments: CsvAttachment[];
  emailsProcessed: number;
  errors: string[];
}> {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  const errors: string[] = [];
  const attachments: CsvAttachment[] = [];

  // Search for emails from sender, received today, with attachments
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  const query = `from:${SENDER_EMAIL} after:${dateStr} has:attachment filename:csv`;

  try {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 10,
    });

    const messages = listResponse.data.messages || [];

    if (messages.length === 0) {
      return { attachments: [], emailsProcessed: 0, errors: ["No emails found from sender today"] };
    }

    for (const msg of messages) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
        });

        const parts = fullMessage.data.payload?.parts || [];

        for (const part of parts) {
          if (
            part.filename &&
            part.filename.toLowerCase().endsWith(".csv") &&
            part.body?.attachmentId
          ) {
            const csvType = identifyCsvType(part.filename);
            if (!csvType) {
              errors.push(`Unknown CSV type: ${part.filename}`);
              continue;
            }

            // Download attachment
            const attachment = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msg.id!,
              id: part.body.attachmentId,
            });

            if (attachment.data.data) {
              // Gmail returns base64url-encoded data
              const csvText = Buffer.from(
                attachment.data.data,
                "base64"
              ).toString("utf-8");

              attachments.push({
                type: csvType,
                filename: part.filename,
                data: csvText,
              });
            }
          }
        }
      } catch (err) {
        errors.push(`Error processing message ${msg.id}: ${err}`);
      }
    }

    return {
      attachments,
      emailsProcessed: messages.length,
      errors,
    };
  } catch (err) {
    return {
      attachments: [],
      emailsProcessed: 0,
      errors: [`Gmail API error: ${err}`],
    };
  }
}

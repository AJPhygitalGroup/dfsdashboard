import { NextRequest, NextResponse } from "next/server";
import { insertCsvUpload, type CsvType } from "@/lib/csv-uploads";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

const API_KEY = process.env.UPLOAD_API_KEY || "dfs-metrics-key-2026";
const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

async function authenticate(request: NextRequest): Promise<{ authorized: boolean; userId: number | null }> {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (token === API_KEY) return { authorized: true, userId: null };
  }

  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (cookie?.value) {
    const payload = await verifyToken(cookie.value);
    if (payload) return { authorized: true, userId: payload.userId };
  }

  return { authorized: false, userId: null };
}

export async function POST(request: NextRequest) {
  const { authorized, userId } = await authenticate(request);
  if (!authorized) {
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

    if (!VALID_TYPES.includes(type as CsvType)) {
      return NextResponse.json(
        { error: "Invalid type. Use: inspections, defects, work_orders" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const lines = csvText.split("\n").filter((line) => line.trim());
    const recordCount = Math.max(0, lines.length - 1);

    const upload = await insertCsvUpload({
      type: type as CsvType,
      fileName: file.name,
      content: csvText,
      recordCount,
      uploadedBy: userId,
      uploadSource: "manual",
      fileSizeBytes: csvText.length,
    });

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      message: `${type} data uploaded successfully`,
      recordCount,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Failed to process upload: ${error}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { saveCsvToBlobVersioned, type CsvType } from "@/lib/blob-store";
import { insertCsvUpload } from "@/lib/csv-uploads";

export const dynamic = "force-dynamic";

const API_KEY = process.env.UPLOAD_API_KEY || "dfs-metrics-key-2026";
const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

function validateApiKey(request: NextRequest): boolean {
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

    if (!VALID_TYPES.includes(type as CsvType)) {
      return NextResponse.json(
        { error: "Invalid type. Use: inspections, defects, work_orders" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const lines = csvText.split("\n").filter((line) => line.trim());
    const recordCount = Math.max(0, lines.length - 1);

    // Save to Blob with unique path
    const { url, sizeBytes } = await saveCsvToBlobVersioned(
      type as CsvType,
      csvText,
      file.name
    );

    // Save metadata to Postgres
    const upload = await insertCsvUpload({
      type: type as CsvType,
      blobUrl: url,
      fileName: file.name,
      recordCount,
      uploadedBy: null,
      uploadSource: "manual",
      fileSizeBytes: sizeBytes,
    });

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      message: `${type} data uploaded successfully`,
      recordCount,
      blobUrl: url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Failed to process upload: ${error}` },
      { status: 500 }
    );
  }
}

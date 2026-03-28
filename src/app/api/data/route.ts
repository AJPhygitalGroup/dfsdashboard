import { NextRequest, NextResponse } from "next/server";
import { getSyncMetadataUrl, fetchCsvContent, type CsvType } from "@/lib/blob-store";
import { getLatestUpload, getUploadById } from "@/lib/csv-uploads";

export const dynamic = "force-dynamic";

const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");

  try {
    // Return sync metadata
    if (type === "sync-metadata") {
      const metaUrl = await getSyncMetadataUrl();
      if (!metaUrl) {
        return NextResponse.json({ error: "No sync metadata" }, { status: 404 });
      }
      const res = await fetch(metaUrl);
      const json = await res.json();
      return NextResponse.json(json);
    }

    // Serve a specific upload by ID
    if (id) {
      const upload = await getUploadById(parseInt(id));
      if (!upload) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }
      const csvText = await fetchCsvContent(upload.blob_url);
      return new NextResponse(csvText, {
        headers: {
          "Content-Type": "text/csv",
          "X-Upload-Id": String(upload.id),
          "X-Record-Count": String(upload.record_count),
          "X-Upload-Source": upload.upload_source,
          "X-Created-At": upload.created_at,
          "X-File-Name": upload.file_name,
        },
      });
    }

    // Serve latest upload for a given type
    if (type && VALID_TYPES.includes(type as CsvType)) {
      const upload = await getLatestUpload(type as CsvType);
      if (!upload) {
        return NextResponse.json(
          { error: `No ${type} data available yet` },
          { status: 404 }
        );
      }
      const csvText = await fetchCsvContent(upload.blob_url);
      return new NextResponse(csvText, {
        headers: {
          "Content-Type": "text/csv",
          "X-Upload-Id": String(upload.id),
          "X-Record-Count": String(upload.record_count),
          "X-Upload-Source": upload.upload_source,
          "X-Created-At": upload.created_at,
          "X-File-Name": upload.file_name,
        },
      });
    }

    // Return availability of each type
    const available: Record<string, boolean> = {};
    for (const t of VALID_TYPES) {
      const latest = await getLatestUpload(t);
      available[t] = !!latest;
    }

    return NextResponse.json({ available });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch data: ${error}` },
      { status: 500 }
    );
  }
}

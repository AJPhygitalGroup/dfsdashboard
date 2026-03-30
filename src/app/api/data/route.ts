import { NextRequest, NextResponse } from "next/server";
import { getLatestUploadContent, getUploadContentById, type CsvType } from "@/lib/csv-uploads";

export const dynamic = "force-dynamic";

const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");

  try {
    // Serve a specific upload by ID
    if (id) {
      const result = await getUploadContentById(parseInt(id));
      if (!result) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }
      return new NextResponse(result.content, {
        headers: {
          "Content-Type": "text/csv",
          "X-Upload-Id": String(result.meta.id),
          "X-Record-Count": String(result.meta.record_count),
          "X-Upload-Source": result.meta.upload_source,
          "X-Created-At": result.meta.created_at,
          "X-File-Name": result.meta.file_name,
        },
      });
    }

    // Serve latest upload for a given type
    if (type && VALID_TYPES.includes(type as CsvType)) {
      const result = await getLatestUploadContent(type as CsvType);
      if (!result) {
        return NextResponse.json(
          { error: `No ${type} data available yet` },
          { status: 404 }
        );
      }
      return new NextResponse(result.content, {
        headers: {
          "Content-Type": "text/csv",
          "X-Upload-Id": String(result.meta.id),
          "X-Record-Count": String(result.meta.record_count),
          "X-Upload-Source": result.meta.upload_source,
          "X-Created-At": result.meta.created_at,
          "X-File-Name": result.meta.file_name,
        },
      });
    }

    // Return availability of each type
    const available: Record<string, boolean> = {};
    for (const t of VALID_TYPES) {
      const result = await getLatestUploadContent(t);
      available[t] = !!result;
    }

    return NextResponse.json({ available });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch data: ${error}` },
      { status: 500 }
    );
  }
}

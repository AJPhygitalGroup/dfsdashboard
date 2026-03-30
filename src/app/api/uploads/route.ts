import { NextRequest, NextResponse } from "next/server";
import { listUploads, type CsvType } from "@/lib/csv-uploads";

export const dynamic = "force-dynamic";

const VALID_TYPES: CsvType[] = ["inspections", "defects", "work_orders"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") as CsvType | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use: inspections, defects, work_orders" },
        { status: 400 }
      );
    }

    const { uploads, total } = await listUploads({
      type: type || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ uploads, total, limit, offset });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list uploads: ${error}` },
      { status: 500 }
    );
  }
}

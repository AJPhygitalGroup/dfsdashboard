import { NextRequest, NextResponse } from "next/server";
import { getAllCsvUrls } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  try {
    const urls = await getAllCsvUrls();

    if (type && (type === "inspections" || type === "defects" || type === "work_orders")) {
      const url = urls[type];
      if (!url) {
        return NextResponse.json(
          { error: `No ${type} data available yet` },
          { status: 404 }
        );
      }
      // Fetch the CSV and return it as text
      const response = await fetch(url);
      const csvText = await response.text();
      return new NextResponse(csvText, {
        headers: { "Content-Type": "text/csv" },
      });
    }

    // Return all available URLs
    return NextResponse.json({
      available: {
        inspections: !!urls.inspections,
        defects: !!urls.defects,
        work_orders: !!urls.work_orders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch data: ${error}` },
      { status: 500 }
    );
  }
}

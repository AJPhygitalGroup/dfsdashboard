import { put, list } from "@vercel/blob";

const BLOB_PREFIX = "dfs-metrics/";

export type CsvType = "inspections" | "defects" | "work_orders";

function getBlobPath(type: CsvType): string {
  return `${BLOB_PREFIX}${type}.csv`;
}

export async function saveCsvToBlob(
  type: CsvType,
  csvText: string
): Promise<string> {
  const path = getBlobPath(type);
  const blob = await put(path, csvText, {
    access: "public",
    contentType: "text/csv",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function getCsvUrl(type: CsvType): Promise<string | null> {
  const path = getBlobPath(type);
  const { blobs } = await list({ prefix: path });
  if (blobs.length === 0) return null;
  return blobs[0].url;
}

export async function getAllCsvUrls(): Promise<
  Record<CsvType, string | null>
> {
  const types: CsvType[] = ["inspections", "defects", "work_orders"];
  const result: Record<string, string | null> = {};

  for (const type of types) {
    result[type] = await getCsvUrl(type);
  }

  return result as Record<CsvType, string | null>;
}

/** Save CSV to Blob with a unique timestamped path (no overwrite) */
export async function saveCsvToBlobVersioned(
  type: CsvType,
  csvText: string,
  originalFilename: string
): Promise<{ url: string; sizeBytes: number }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${BLOB_PREFIX}${type}/${timestamp}.csv`;
  const blob = await put(path, csvText, {
    access: "public",
    contentType: "text/csv",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return { url: blob.url, sizeBytes: csvText.length };
}

/** Fetch CSV content from a Blob URL */
export async function fetchCsvContent(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  if (!response.ok) throw new Error(`Failed to fetch blob: ${response.status}`);
  return response.text();
}

/** Save sync metadata (timestamp, email count, etc.) */
export async function saveSyncMetadata(metadata: {
  timestamp: string;
  emailsProcessed: number;
  attachmentsFound: number;
}): Promise<string> {
  const path = `${BLOB_PREFIX}sync-metadata.json`;
  const blob = await put(path, JSON.stringify(metadata), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/** Get sync metadata URL */
export async function getSyncMetadataUrl(): Promise<string | null> {
  const path = `${BLOB_PREFIX}sync-metadata.json`;
  const { blobs } = await list({ prefix: path });
  if (blobs.length === 0) return null;
  return blobs[0].url;
}

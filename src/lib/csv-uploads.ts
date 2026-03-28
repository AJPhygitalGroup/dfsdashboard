import { sql } from "@vercel/postgres";
import { ensureSchema } from "./db-schema";
import type { CsvType } from "./blob-store";

export interface CsvUploadRecord {
  id: number;
  type: CsvType;
  blob_url: string;
  file_name: string;
  record_count: number;
  uploaded_by: number | null;
  upload_source: "manual" | "email-sync";
  file_size_bytes: number | null;
  created_at: string;
}

let schemaReady: Promise<void> | null = null;
function ensureSchemaOnce(): Promise<void> {
  if (!schemaReady) schemaReady = ensureSchema();
  return schemaReady;
}

export async function insertCsvUpload(params: {
  type: CsvType;
  blobUrl: string;
  fileName: string;
  recordCount: number;
  uploadedBy: number | null;
  uploadSource: "manual" | "email-sync";
  fileSizeBytes: number | null;
}): Promise<CsvUploadRecord> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    INSERT INTO csv_uploads (type, blob_url, file_name, record_count, uploaded_by, upload_source, file_size_bytes)
    VALUES (${params.type}, ${params.blobUrl}, ${params.fileName}, ${params.recordCount}, ${params.uploadedBy}, ${params.uploadSource}, ${params.fileSizeBytes})
    RETURNING *
  `;

  return rows[0] as CsvUploadRecord;
}

export async function getLatestUpload(type: CsvType): Promise<CsvUploadRecord | null> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    SELECT * FROM csv_uploads WHERE type = ${type} ORDER BY created_at DESC LIMIT 1
  `;

  return (rows[0] as CsvUploadRecord) || null;
}

export async function getUploadById(id: number): Promise<CsvUploadRecord | null> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    SELECT * FROM csv_uploads WHERE id = ${id}
  `;

  return (rows[0] as CsvUploadRecord) || null;
}

export async function listUploads(params?: {
  type?: CsvType;
  limit?: number;
  offset?: number;
}): Promise<{ uploads: CsvUploadRecord[]; total: number }> {
  await ensureSchemaOnce();

  const limit = Math.min(params?.limit || 20, 100);
  const offset = params?.offset || 0;

  let uploads: CsvUploadRecord[];
  let total: number;

  if (params?.type) {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM csv_uploads WHERE type = ${params.type}
    `;
    total = parseInt(countResult.rows[0].count as string);

    const { rows } = await sql`
      SELECT * FROM csv_uploads WHERE type = ${params.type}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    uploads = rows as CsvUploadRecord[];
  } else {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM csv_uploads
    `;
    total = parseInt(countResult.rows[0].count as string);

    const { rows } = await sql`
      SELECT * FROM csv_uploads ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    uploads = rows as CsvUploadRecord[];
  }

  return { uploads, total };
}

import { sql } from "@vercel/postgres";
import { ensureSchema } from "./db-schema";

export type CsvType = "inspections" | "defects" | "work_orders";

export interface CsvUploadRecord {
  id: number;
  type: CsvType;
  file_name: string;
  content: string;
  record_count: number;
  uploaded_by: number | null;
  upload_source: "manual" | "email-sync";
  file_size_bytes: number | null;
  created_at: string;
}

/** Lightweight version without content for listing */
export interface CsvUploadMeta {
  id: number;
  type: CsvType;
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
  fileName: string;
  content: string;
  recordCount: number;
  uploadedBy: number | null;
  uploadSource: "manual" | "email-sync";
  fileSizeBytes: number | null;
}): Promise<CsvUploadMeta> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    INSERT INTO csv_uploads (type, file_name, content, record_count, uploaded_by, upload_source, file_size_bytes)
    VALUES (${params.type}, ${params.fileName}, ${params.content}, ${params.recordCount}, ${params.uploadedBy}, ${params.uploadSource}, ${params.fileSizeBytes})
    RETURNING id, type, file_name, record_count, uploaded_by, upload_source, file_size_bytes, created_at
  `;

  return rows[0] as CsvUploadMeta;
}

export async function getLatestUploadContent(type: CsvType): Promise<{ meta: CsvUploadMeta; content: string } | null> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    SELECT * FROM csv_uploads WHERE type = ${type} ORDER BY created_at DESC LIMIT 1
  `;

  if (!rows[0]) return null;
  const row = rows[0] as CsvUploadRecord;
  const { content, ...meta } = row;
  return { meta, content };
}

export async function getUploadContentById(id: number): Promise<{ meta: CsvUploadMeta; content: string } | null> {
  await ensureSchemaOnce();

  const { rows } = await sql`
    SELECT * FROM csv_uploads WHERE id = ${id}
  `;

  if (!rows[0]) return null;
  const row = rows[0] as CsvUploadRecord;
  const { content, ...meta } = row;
  return { meta, content };
}

export async function listUploads(params?: {
  type?: CsvType;
  limit?: number;
  offset?: number;
}): Promise<{ uploads: CsvUploadMeta[]; total: number }> {
  await ensureSchemaOnce();

  const limit = Math.min(params?.limit || 20, 100);
  const offset = params?.offset || 0;

  let uploads: CsvUploadMeta[];
  let total: number;

  if (params?.type) {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM csv_uploads WHERE type = ${params.type}
    `;
    total = parseInt(countResult.rows[0].count as string);

    const { rows } = await sql`
      SELECT id, type, file_name, record_count, uploaded_by, upload_source, file_size_bytes, created_at
      FROM csv_uploads WHERE type = ${params.type}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    uploads = rows as CsvUploadMeta[];
  } else {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM csv_uploads
    `;
    total = parseInt(countResult.rows[0].count as string);

    const { rows } = await sql`
      SELECT id, type, file_name, record_count, uploaded_by, upload_source, file_size_bytes, created_at
      FROM csv_uploads ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    uploads = rows as CsvUploadMeta[];
  }

  return { uploads, total };
}

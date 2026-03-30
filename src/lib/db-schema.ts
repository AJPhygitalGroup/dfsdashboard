import { sql } from "@vercel/postgres";

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'viewer' NOT NULL,
      dsp VARCHAR(255),
      active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Create index on email for fast lookups (IF NOT EXISTS for idempotency)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `;

  // CSV uploads history table
  await sql`
    CREATE TABLE IF NOT EXISTS csv_uploads (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      upload_source VARCHAR(50) NOT NULL DEFAULT 'manual',
      file_size_bytes INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Migration: add content column if table was created with old schema
  await sql`
    DO $$ BEGIN
      ALTER TABLE csv_uploads ADD COLUMN content TEXT NOT NULL DEFAULT '';
    EXCEPTION WHEN duplicate_column THEN
      NULL;
    END $$
  `;

  // Migration: drop blob_url column if it exists from old schema
  await sql`
    DO $$ BEGIN
      ALTER TABLE csv_uploads DROP COLUMN blob_url;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END $$
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_csv_uploads_type ON csv_uploads(type)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_csv_uploads_type_created ON csv_uploads(type, created_at DESC)
  `;
}

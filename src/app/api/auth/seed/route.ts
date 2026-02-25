import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/auth";
import { ensureSchema } from "@/lib/db-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Protected by CRON_SECRET (same pattern as /api/cron)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure the users table exists
    await ensureSchema();

    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "email, password, and name are required" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Upsert: insert or update if email exists
    await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name}, ${role || "viewer"})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: `User ${email} created/updated with role: ${role || "viewer"}`,
    });
  } catch (error) {
    console.error("[SEED] Error:", error);
    return NextResponse.json(
      { error: `Seed failed: ${error}` },
      { status: 500 }
    );
  }
}

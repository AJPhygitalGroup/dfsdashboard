import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { jwtVerify } from "jose";
import { hashPassword, AUTH_COOKIE_NAME } from "@/lib/auth";
import { ensureSchema } from "@/lib/db-schema";

export const dynamic = "force-dynamic";

// Verify admin access from JWT cookie
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

// GET /api/admin/users — List all users
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { rows } = await sql`
      SELECT id, email, name, role, dsp, active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error("[ADMIN] List users error:", error);
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 });
  }
}

// POST /api/admin/users — Create a new user
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    await ensureSchema();

    const { email, password, name, role, dsp } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userRole = role || "viewer";
    const userDsp = dsp || null;

    const { rows } = await sql`
      INSERT INTO users (email, password_hash, name, role, dsp)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name}, ${userRole}, ${userDsp})
      RETURNING id, email, name, role, dsp, active, created_at
    `;

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("[ADMIN] Create user error:", error);
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { jwtVerify } from "jose";
import { hashPassword, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

// PUT /api/admin/users/[id] — Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, role, dsp, active, password } = body;

    // Build dynamic update
    if (password) {
      const passwordHash = await hashPassword(password);
      await sql`
        UPDATE users SET
          name = COALESCE(${name}, name),
          role = COALESCE(${role}, role),
          dsp = ${dsp !== undefined ? dsp : null},
          active = COALESCE(${active}, active),
          password_hash = ${passwordHash},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else {
      await sql`
        UPDATE users SET
          name = COALESCE(${name}, name),
          role = COALESCE(${role}, role),
          dsp = ${dsp !== undefined ? dsp : null},
          active = COALESCE(${active}, active),
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    // Return updated user
    const { rows } = await sql`
      SELECT id, email, name, role, dsp, active, created_at, updated_at
      FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("[ADMIN] Update user error:", error);
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — Deactivate a user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await sql`
      UPDATE users SET active = false, updated_at = NOW()
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, message: "User deactivated" });
  } catch (error) {
    console.error("[ADMIN] Deactivate user error:", error);
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 });
  }
}

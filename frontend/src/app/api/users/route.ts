// GET    /api/users       — list all users (admin only)
// PATCH  /api/users/[id]  — update role (admin only)
// DELETE /api/users/[id]  — delete user (super_admin only)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';
import { hashSync } from 'bcryptjs';

export const runtime = 'edge';

type UserRow = {
  id: number; username: string; email: string; role: string;
  phone: string | null; address: string | null; created_at: string;
};

const VALID_ROLES = ['visitor', 'customer', 'staff', 'admin', 'super_admin'];

export async function GET(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  const { results } = await db.prepare(
    'SELECT id, username, email, role, phone, address, created_at FROM users ORDER BY created_at DESC'
  ).all<UserRow>();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  try {
    const { username, password, email, role, phone, address } = await req.json();

    if (!username || !password || !email || !role) {
      return NextResponse.json({ detail: 'Username, password, email, and role are required.' }, { status: 400 });
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ detail: 'Invalid role.' }, { status: 400 });
    }

    // Restriction: Only super_admin can create super_admin accounts
    if (role === 'super_admin' && payload.role !== 'super_admin') {
      return NextResponse.json({ detail: 'Only super_admin can assign super_admin role.' }, { status: 403 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { detail: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ detail: 'Invalid email address format.' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ detail: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json({ detail: 'Password must contain at least one letter and one number.' }, { status: 400 });
    }

    const db = getDB(req);

    // Check existing
    const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(username, email).first<{ id: number }>();
    if (existing) {
      return NextResponse.json({ detail: 'Username or email already taken.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = hashSync(password, 10);

    // Insert user
    const { meta } = await db.prepare(
      'INSERT INTO users (username, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(username, email, hashedPassword, role, phone || null, address || null).run();

    const created = await db.prepare(
      'SELECT id, username, email, role, phone, address, created_at FROM users WHERE id = ?'
    ).bind(meta.last_row_id).first<UserRow>();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 });
  }
}

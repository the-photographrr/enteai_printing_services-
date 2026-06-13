// PATCH  /api/users/[id]  — update user details
// DELETE /api/users/[id]  — delete user (super_admin only)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';
import { hashSync } from 'bcryptjs';

export const runtime = 'edge';

const VALID_ROLES = ['visitor', 'customer', 'staff', 'admin', 'super_admin'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);
  const body = await req.json();

  const target = await db.prepare('SELECT username, email, role, phone, address FROM users WHERE id = ?')
    .bind(Number(id)).first<{ username: string; email: string; role: string; phone: string | null; address: string | null }>();
  if (!target) return NextResponse.json({ detail: 'User not found.' }, { status: 404 });

  // Prevent admins from creating/assigning super_admins (only super_admin can)
  if (body.role === 'super_admin' && payload.role !== 'super_admin')
    return NextResponse.json({ detail: 'Only super_admin can assign super_admin role.' }, { status: 403 });

  // Prevent admins from modifying other admins/super_admins
  if (['admin', 'super_admin'].includes(target.role) && payload.role !== 'super_admin')
    return NextResponse.json({ detail: 'Cannot modify admin-level users.' }, { status: 403 });

  // Prevent self-demotion
  if (Number(id) === Number(payload.sub) && body.role && body.role !== target.role)
    return NextResponse.json({ detail: 'Cannot modify your own role.' }, { status: 400 });

  // Input validations if updating fields
  const username = body.username ?? target.username;
  const email = body.email ?? target.email;
  const phone = body.phone !== undefined ? body.phone : target.phone;
  const address = body.address !== undefined ? body.address : target.address;
  const role = VALID_ROLES.includes(body.role) ? body.role : target.role;

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

  // Ensure unique username/email
  if (username !== target.username || email !== target.email) {
    const existing = await db.prepare('SELECT id FROM users WHERE (username = ? AND id != ?) OR (email = ? AND id != ?)')
      .bind(username, Number(id), email, Number(id)).first<{ id: number }>();
    if (existing) {
      return NextResponse.json({ detail: 'Username or email already taken.' }, { status: 400 });
    }
  }

  let updatePasswordSQL = '';
  const bindParams: (string | number | null)[] = [username, email, role, phone, address];

  if (body.password) {
    // Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json({ detail: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    const hasLetter = /[a-zA-Z]/.test(body.password);
    const hasNumber = /[0-9]/.test(body.password);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json({ detail: 'Password must contain at least one letter and one number.' }, { status: 400 });
    }

    const hashedPassword = hashSync(body.password, 10);
    updatePasswordSQL = ', password = ?';
    bindParams.push(hashedPassword);
  }

  bindParams.push(Number(id));

  await db.prepare(
    `UPDATE users SET username = ?, email = ?, role = ?, phone = ?, address = ?${updatePasswordSQL} WHERE id = ?`
  ).bind(...bindParams).run();

  const updated = await db.prepare(
    'SELECT id, username, email, role, phone, address, created_at FROM users WHERE id = ?'
  ).bind(Number(id)).first();

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (Number(id) === Number(payload.sub))
    return NextResponse.json({ detail: 'Cannot delete your own account.' }, { status: 400 });

  const db = getDB(req);

  // Only super_admin can delete admin-level accounts
  const target = await db.prepare('SELECT role FROM users WHERE id = ?').bind(Number(id)).first<{ role: string }>();
  if (!target) return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  if (['admin', 'super_admin'].includes(target.role) && payload.role !== 'super_admin')
    return NextResponse.json({ detail: 'Only super_admin can delete admin accounts.' }, { status: 403 });

  await db.prepare('DELETE FROM users WHERE id = ?').bind(Number(id)).run();
  return new NextResponse(null, { status: 204 });
}

// GET /api/auth/profile  — returns current user
// PATCH /api/auth/profile — updates address/phone
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';

export const runtime = 'edge';

type UserRow = { id: number; username: string; email: string; role: string; phone: string | null; address: string | null };

export async function GET(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  const user = await db.prepare(
    'SELECT id, username, email, role, phone, address FROM users WHERE id = ?'
  ).bind(Number(payload.sub)).first<UserRow>();

  if (!user) return NextResponse.json({ detail: 'User not found.' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  const body = await req.json();

  await db.prepare(
    'UPDATE users SET address = COALESCE(?, address), phone = COALESCE(?, phone) WHERE id = ?'
  ).bind(body.address ?? null, body.phone ?? null, Number(payload.sub)).run();

  const updated = await db.prepare(
    'SELECT id, username, email, role, phone, address FROM users WHERE id = ?'
  ).bind(Number(payload.sub)).first<UserRow>();

  return NextResponse.json(updated);
}

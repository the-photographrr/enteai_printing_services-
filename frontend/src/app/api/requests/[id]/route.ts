// PATCH /api/requests/[id]  — update status, tracking (admin)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';

export const runtime = 'edge';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin', 'staff'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);
  const body = await req.json();

  await db.prepare(
    `UPDATE requests SET
       status = COALESCE(?, status),
       shipping_carrier = COALESCE(?, shipping_carrier),
       tracking_number = COALESCE(?, tracking_number)
     WHERE id = ?`
  ).bind(body.status ?? null, body.shipping_carrier ?? null, body.tracking_number ?? null, Number(id)).run();

  const updated = await db.prepare('SELECT * FROM requests WHERE id = ?').bind(Number(id)).first<Record<string, unknown>>();
  return NextResponse.json(updated);
}

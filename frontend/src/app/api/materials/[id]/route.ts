// PATCH / DELETE /api/materials/[id]
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';

export const runtime = 'edge';

type MaterialRow = { id: number; name: string; brand: string; type: string; color: string; available_stock: number; reserved_stock: number; reorder_level: number };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin', 'staff'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);
  const body = await req.json();

  await db.prepare(
    `UPDATE materials SET
       name = COALESCE(?, name), brand = COALESCE(?, brand), type = COALESCE(?, type),
       color = COALESCE(?, color), available_stock = COALESCE(?, available_stock),
       reserved_stock = COALESCE(?, reserved_stock), reorder_level = COALESCE(?, reorder_level)
     WHERE id = ?`
  ).bind(
    body.name ?? null, body.brand ?? null, body.type ?? null, body.color ?? null,
    body.available_stock ?? null, body.reserved_stock ?? null, body.reorder_level ?? null,
    Number(id)
  ).run();

  const updated = await db.prepare('SELECT * FROM materials WHERE id = ?').bind(Number(id)).first<MaterialRow>();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);
  await db.prepare('DELETE FROM materials WHERE id = ?').bind(Number(id)).run();
  return new NextResponse(null, { status: 204 });
}

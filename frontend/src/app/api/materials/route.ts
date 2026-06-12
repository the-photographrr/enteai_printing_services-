// GET  /api/materials  — list all materials
// POST /api/materials  — create (admin)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';

export const runtime = 'edge';

type MaterialRow = { id: number; name: string; brand: string; type: string; color: string; available_stock: number; reserved_stock: number; reorder_level: number };

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const { results } = await db.prepare('SELECT * FROM materials ORDER BY type, color').all<MaterialRow>();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin', 'staff'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  const { name, brand, type, color, available_stock, reserved_stock, reorder_level } = await req.json();

  const { meta } = await db.prepare(
    'INSERT INTO materials (name, brand, type, color, available_stock, reserved_stock, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, brand ?? 'Generic', type, color, available_stock ?? 0, reserved_stock ?? 0, reorder_level ?? 0.5).run();

  const created = await db.prepare('SELECT * FROM materials WHERE id = ?').bind(meta.last_row_id).first<MaterialRow>();
  return NextResponse.json(created, { status: 201 });
}

// GET  /api/products  — list active products
// POST /api/products  — create product (admin)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB, getR2 } from '@/lib/cf';

export const runtime = 'edge';

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';

type ProductRow = { id: number; title: string; description: string; category: string; image_key: string | null; rate: number; status: string; created_at: string };

function withImage(p: ProductRow) {
  return { ...p, image: p.image_key ? (R2_PUBLIC ? `${R2_PUBLIC}/${p.image_key}` : `/api/media/${p.image_key}`) : null };
}

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const { results } = await db.prepare(
    "SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC"
  ).all<ProductRow>();
  return NextResponse.json(results.map(withImage));
}

export async function POST(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin', 'staff'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  let r2: R2Bucket | null = null;
  try { r2 = getR2(req); } catch { /* R2 optional in dev */ }

  const formData = await req.formData();
  const title = formData.get('title') as string;
  const description = (formData.get('description') as string) ?? '';
  const category = formData.get('category') as string;
  const rate = parseFloat(formData.get('rate') as string) || 0;
  const status = (formData.get('status') as string) ?? 'active';
  const imageFile = formData.get('image') as File | null;

  if (!title || !category) {
    return NextResponse.json({ detail: 'Title and category are required.' }, { status: 400 });
  }

  let imageKey: string | null = null;
  if (imageFile && imageFile.size > 0 && r2) {
    imageKey = `products/${crypto.randomUUID()}-${imageFile.name.replace(/\s+/g, '_')}`;
    await r2.put(imageKey, await imageFile.arrayBuffer(), {
      httpMetadata: { contentType: imageFile.type || 'image/jpeg' }
    });
  }

  const { meta } = await db.prepare(
    'INSERT INTO products (title, description, category, rate, status, image_key) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(title, description, category, rate, status, imageKey).run();

  const created = await db.prepare('SELECT * FROM products WHERE id = ?').bind(meta.last_row_id).first<ProductRow>();
  return NextResponse.json(created ? withImage(created) : null, { status: 201 });
}

// GET / PATCH / DELETE /api/products/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getDB, getR2 } from '@/lib/cf';
import { verifyToken, extractBearer } from '@/lib/auth';

export const runtime = 'edge';

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
type ProductRow = { id: number; title: string; description: string; category: string; image_key: string | null; rate: number; status: string; created_at: string };
const withImage = (p: ProductRow) => ({ ...p, image: p.image_key ? (R2_PUBLIC ? `${R2_PUBLIC}/${p.image_key}` : `/api/media/${p.image_key}`) : null });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB(req);
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first<ProductRow>();
  if (!product) return NextResponse.json({ detail: 'Not found.' }, { status: 404 });
  return NextResponse.json(withImage(product));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin', 'staff'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);

  const formData = await req.formData();
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const category = formData.get('category') as string | null;
  const rateVal = formData.get('rate') as string | null;
  const rate = rateVal !== null ? parseFloat(rateVal) : null;
  const status = formData.get('status') as string | null;
  const imageFile = formData.get('image') as File | null;

  let imageKey: string | null = null;
  let hasNewImage = false;

  if (imageFile && imageFile.size > 0) {
    let r2: R2Bucket | null = null;
    try { r2 = getR2(req); } catch { /* R2 optional in dev */ }
    if (r2) {
      imageKey = `products/${crypto.randomUUID()}-${imageFile.name.replace(/\s+/g, '_')}`;
      await r2.put(imageKey, await imageFile.arrayBuffer(), {
        httpMetadata: { contentType: imageFile.type || 'image/jpeg' }
      });
      hasNewImage = true;
    }
  }

  await db.prepare(
    `UPDATE products SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       category = COALESCE(?, category),
       rate = COALESCE(?, rate),
       status = COALESCE(?, status),
       image_key = CASE WHEN ? = 1 THEN ? ELSE image_key END
     WHERE id = ?`
  ).bind(
    title,
    description,
    category,
    rate,
    status,
    hasNewImage ? 1 : 0,
    imageKey,
    Number(id)
  ).run();

  const updated = await db.prepare('SELECT * FROM products WHERE id = ?').bind(Number(id)).first<ProductRow>();
  return NextResponse.json(updated ? withImage(updated) : null);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role))
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });

  const { id } = await params;
  const db = getDB(req);
  await db.prepare('DELETE FROM products WHERE id = ?').bind(Number(id)).run();
  return new NextResponse(null, { status: 204 });
}

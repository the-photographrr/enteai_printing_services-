// GET  /api/products  — list active products
// POST /api/products  — create product (admin)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB, getR2 } from '@/lib/cf';

export const runtime = 'edge';

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';

type ProductRow = { id: number; title: string; description: string; category: string; image_key: string | null; media_keys: string | null; rate: number; status: string; created_at: string };

function withImage(p: ProductRow) {
  const finalP = { ...p, image: null as string | null, media: [] as string[] };
  
  if (p.image_key) {
    if (p.image_key.startsWith('http://') || p.image_key.startsWith('https://') || p.image_key.startsWith('/')) {
      finalP.image = p.image_key;
    } else {
      finalP.image = R2_PUBLIC ? `${R2_PUBLIC}/${p.image_key}` : `/api/media/${p.image_key}`;
    }
  }

  if (p.media_keys) {
    try {
      const keys = JSON.parse(p.media_keys);
      finalP.media = keys.map((key: string) => {
        if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) return key;
        return R2_PUBLIC ? `${R2_PUBLIC}/${key}` : `/api/media/${key}`;
      });
    } catch {
      finalP.media = [];
    }
  }

  if (!finalP.image && finalP.media.length > 0) {
    finalP.image = finalP.media[0];
  }

  return finalP;
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
  const imageKeyParam = formData.get('image_key') as string | null;
  
  const mediaFiles = formData.getAll('media') as File[];
  const mediaKeysParam = formData.get('media_keys') as string | null;

  if (!title || !category) {
    return NextResponse.json({ detail: 'Title and category are required.' }, { status: 400 });
  }

  let mediaKeys: string[] = [];
  if (mediaKeysParam) {
    try {
      mediaKeys = JSON.parse(mediaKeysParam);
    } catch { /* ignore */ }
  }

  let imageKey: string | null = null;

  if (imageFile && imageFile.size > 0 && r2) {
    imageKey = `products/${crypto.randomUUID()}-${imageFile.name.replace(/\\s+/g, '_')}`;
    await r2.put(imageKey, await imageFile.arrayBuffer(), {
      httpMetadata: { contentType: imageFile.type || 'image/jpeg' }
    });
    mediaKeys.unshift(imageKey);
  } else if (imageKeyParam) {
    imageKey = imageKeyParam;
    mediaKeys.unshift(imageKey);
  }

  for (const file of mediaFiles) {
    if (file && file.size > 0 && r2) {
      const key = `products/${crypto.randomUUID()}-${file.name.replace(/\\s+/g, '_')}`;
      await r2.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
      });
      mediaKeys.push(key);
    }
  }

  mediaKeys = Array.from(new Set(mediaKeys)); // ensure uniqueness
  if (!imageKey && mediaKeys.length > 0) {
    imageKey = mediaKeys[0];
  }

  const { meta } = await db.prepare(
    'INSERT INTO products (title, description, category, rate, status, image_key, media_keys) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(title, description, category, rate, status, imageKey, JSON.stringify(mediaKeys)).run();

  const created = await db.prepare('SELECT * FROM products WHERE id = ?').bind(meta.last_row_id).first<ProductRow>();
  return NextResponse.json(created ? withImage(created) : null, { status: 201 });
}

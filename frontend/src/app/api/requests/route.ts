// GET  /api/requests  — list requests
// POST /api/requests  — create request + upload STL to R2
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB, getR2 } from '@/lib/cf';

export const runtime = 'edge';

const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';

type RequestRow = Record<string, unknown>;
type FileRow = { id: number; request_id: number; file_key: string; file_type: string; volume_cm3: number | null; uploaded_at: string };

function fileUrl(key: string) {
  return R2_PUBLIC ? `${R2_PUBLIC}/${key}` : `/api/media/${key}`;
}

export async function GET(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  const isAdmin = ['admin', 'super_admin', 'staff'].includes(payload.role);

  const { results: requests } = isAdmin
    ? await db.prepare('SELECT r.*, u.username FROM requests r JOIN users u ON r.customer_id = u.id ORDER BY r.created_at DESC').all<RequestRow>()
    : await db.prepare('SELECT r.*, u.username FROM requests r JOIN users u ON r.customer_id = u.id WHERE r.customer_id = ? ORDER BY r.created_at DESC').bind(Number(payload.sub)).all<RequestRow>();

  const withFiles = await Promise.all(requests.map(async (r: RequestRow) => {
    const { results: files } = await db.prepare('SELECT * FROM request_files WHERE request_id = ?').bind((r as { id: number }).id).all<FileRow>();
    return { ...r, files: files.map((f: FileRow) => ({ ...f, file: fileUrl(f.file_key) })) };
  }));

  return NextResponse.json(withFiles);
}

export async function POST(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  let r2: R2Bucket | null = null;
  try { r2 = getR2(req) as R2Bucket; } catch { /* R2 optional in dev */ }

  const formData = await req.formData();
  const projectName        = formData.get('project_name') as string;
  const description        = formData.get('description') as string;
  const dimensions         = (formData.get('dimensions') as string) ?? '';
  const materialPreference = formData.get('material_preference') as string;
  const colorPreference    = formData.get('color_preference') as string;
  const infill             = (formData.get('infill') as string) ?? '20%';
  const quantity           = Math.max(1, parseInt((formData.get('quantity') as string) ?? '1') || 1);
  const deliveryDate       = formData.get('required_delivery_date') as string;
  const stlFile            = formData.get('files') as File | null;

  if (!projectName || !description || !materialPreference || !colorPreference || !deliveryDate)
    return NextResponse.json({ detail: 'Required fields missing.' }, { status: 400 });

  const { meta } = await db.prepare(
    `INSERT INTO requests
       (customer_id, project_name, infill, description, dimensions, material_preference, color_preference, quantity, required_delivery_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(Number(payload.sub), projectName, infill, description, dimensions, materialPreference, colorPreference, quantity, deliveryDate).run();

  const requestId = meta.last_row_id;

  if (stlFile && r2) {
    const fileKey = `requests/${crypto.randomUUID()}-${stlFile.name.replace(/\s+/g, '_')}`;
    await r2.put(fileKey, await stlFile.arrayBuffer(), { httpMetadata: { contentType: 'application/octet-stream' } });
    await db.prepare('INSERT INTO request_files (request_id, file_key, file_type) VALUES (?, ?, ?)').bind(requestId, fileKey, 'STL').run();
  }

  const created = await db.prepare('SELECT * FROM requests WHERE id = ?').bind(requestId).first<RequestRow>();
  return NextResponse.json(created, { status: 201 });
}

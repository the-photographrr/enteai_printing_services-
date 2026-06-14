import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB, getR2 } from '@/lib/cf';

export const runtime = 'edge';

type SettingRow = { setting_key: string; setting_value: string };

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const { results } = await db.prepare(
    "SELECT setting_key, setting_value FROM site_settings"
  ).all<SettingRow>();
  
  const settingsObj = results.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(settingsObj);
}

export async function PATCH(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload || !['admin', 'super_admin'].includes(payload.role)) {
    return NextResponse.json({ detail: 'Forbidden.' }, { status: 403 });
  }

  const db = getDB(req);
  const contentType = req.headers.get('content-type') || '';
  let statements = [];

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    let r2: R2Bucket | null = null;
    try { r2 = getR2(req); } catch { /* ignore */ }

    const heroModelFile = formData.get('hero_model_file') as File | null;
    let newModelUrl: string | null = null;
    
    if (heroModelFile && heroModelFile.size > 0 && r2) {
      const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
      const key = `settings/${crypto.randomUUID()}-${heroModelFile.name.replace(/\\s+/g, '_')}`;
      await r2.put(key, await heroModelFile.arrayBuffer(), {
        httpMetadata: { contentType: heroModelFile.type || 'application/vnd.ms-pki.stl' }
      });
      newModelUrl = R2_PUBLIC ? `${R2_PUBLIC}/${key}` : `/api/media/${key}`;
    }

    // Now extract other fields
    for (const [key, value] of formData.entries()) {
      if (key !== 'hero_model_file') {
        let finalValue = value.toString();
        // If we uploaded a file, update the hero_model_url to the new file URL
        if (key === 'hero_model_url' && newModelUrl) {
          finalValue = newModelUrl;
        }
        
        statements.push(db.prepare(
          `INSERT INTO site_settings (setting_key, setting_value) 
           VALUES (?, ?) 
           ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`
        ).bind(key, finalValue));
      }
    }
  } else {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ detail: 'Expected an array of {key, value} objects.' }, { status: 400 });
    }
    statements = body.map((item: { key: string; value: string }) => {
      return db.prepare(
        `INSERT INTO site_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`
      ).bind(item.key, item.value);
    });
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return NextResponse.json({ detail: 'Settings updated successfully' }, { status: 200 });
}

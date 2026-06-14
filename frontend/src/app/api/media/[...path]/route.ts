import { NextRequest, NextResponse } from 'next/server';
import { getR2 } from '@/lib/cf';

export const runtime = 'edge';

/** R2ObjectBody type definitions are incomplete in next-on-pages builds */
interface R2ObjectWithMeta {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
}

function inferContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'stl': return 'model/stl';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const key = path.join('/');

    let r2;
    try {
      r2 = getR2(req);
    } catch {
      return new NextResponse('R2 not available locally without wrangler pages dev', { status: 500 });
    }

    const object = await r2.get(key);

    if (!object) {
      return new NextResponse('Not found', { status: 404 });
    }

    const r2obj = object as unknown as R2ObjectWithMeta;
    const headers = new Headers();
    let contentType = r2obj.httpMetadata?.contentType;

    if (!contentType || contentType === 'application/octet-stream') {
      contentType = inferContentType(key);
    }

    headers.set('Content-Type', contentType);

    if (r2obj.httpEtag) {
      headers.set('etag', r2obj.httpEtag);
    }

    return new NextResponse(object.body, { headers });
  } catch (err) {
    console.error('Error fetching media from R2', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

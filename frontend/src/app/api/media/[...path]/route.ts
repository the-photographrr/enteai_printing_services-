import { NextRequest, NextResponse } from 'next/server';
import { getR2 } from '@/lib/cf';

export const runtime = 'edge';

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

    const headers = new Headers();
    let contentType = (object as any).httpMetadata?.contentType;

    if (!contentType || contentType === 'application/octet-stream') {
      const ext = key.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'png': contentType = 'image/png'; break;
        case 'jpg':
        case 'jpeg': contentType = 'image/jpeg'; break;
        case 'webp': contentType = 'image/webp'; break;
        case 'gif': contentType = 'image/gif'; break;
        case 'svg': contentType = 'image/svg+xml'; break;
        case 'stl': contentType = 'model/stl'; break;
        case 'pdf': contentType = 'application/pdf'; break;
        default: contentType = 'application/octet-stream';
      }
    }

    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }

    return new NextResponse(object.body, {
      headers,
    });
  } catch (err) {
    console.error('Error fetching media from R2', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

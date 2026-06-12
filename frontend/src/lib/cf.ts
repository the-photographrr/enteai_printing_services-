// src/lib/cf.ts
// Helpers to access Cloudflare D1 + R2 bindings from Next.js edge API routes.
// Works with both `wrangler dev` (local) and Cloudflare Pages production.

import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDB(req: Request): D1Database {
  let db: D1Database | null = null;
  try {
    const ctx = getRequestContext();
    db = ctx.env?.DB;
  } catch (err) {
    console.error('getRequestContext error:', err);
  }

  if (!db) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db = (req as any).cf?.env?.DB ?? (globalThis as any).__D1_DB__;
  }

  if (!db) throw new Error('D1 binding "DB" not found. Run via: npx wrangler pages dev');
  return db;
}

export function getR2(req: Request): R2Bucket {
  let r2: R2Bucket | null = null;
  try {
    const ctx = getRequestContext();
    r2 = ctx.env?.MEDIA;
  } catch (err) {
    console.error('getRequestContext error:', err);
  }

  if (!r2) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r2 = (req as any).cf?.env?.MEDIA ?? (globalThis as any).__R2_MEDIA__;
  }

  if (!r2) throw new Error('R2 binding "MEDIA" not found.');
  return r2;
}

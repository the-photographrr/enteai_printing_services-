// GET  /api/orders  — list orders
// POST /api/orders  — place order
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearer } from '@/lib/auth';
import { getDB } from '@/lib/cf';

export const runtime = 'edge';

type OrderRow = Record<string, unknown>;
type ProductRow = { id: number; rate: number };

export async function GET(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  const isAdmin = ['admin', 'super_admin', 'staff'].includes(payload.role);

  const { results } = isAdmin
    ? await db.prepare(`
        SELECT o.*, p.title as product_title, u.username as customer_username
        FROM orders o JOIN products p ON o.product_id = p.id JOIN users u ON o.customer_id = u.id
        ORDER BY o.created_at DESC
      `).all<OrderRow>()
    : await db.prepare(`
        SELECT o.*, p.title as product_title, u.username as customer_username
        FROM orders o JOIN products p ON o.product_id = p.id JOIN users u ON o.customer_id = u.id
        WHERE o.customer_id = ? ORDER BY o.created_at DESC
      `).bind(Number(payload.sub)).all<OrderRow>();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const payload = await verifyToken(extractBearer(req.headers.get('Authorization')) ?? '');
  if (!payload) return NextResponse.json({ detail: 'Unauthorized.' }, { status: 401 });

  const db = getDB(req);
  const { product, quantity, shipping_address } = await req.json();
  if (!product || !shipping_address)
    return NextResponse.json({ detail: 'product and shipping_address are required.' }, { status: 400 });

  const prod = await db.prepare('SELECT * FROM products WHERE id = ?').bind(Number(product)).first<ProductRow>();
  if (!prod) return NextResponse.json({ detail: 'Product not found.' }, { status: 404 });

  const qty = Math.max(1, parseInt(quantity) || 1);
  const totalPrice = prod.rate * qty;

  const { meta } = await db.prepare(
    'INSERT INTO orders (customer_id, product_id, quantity, total_price, shipping_address) VALUES (?, ?, ?, ?, ?)'
  ).bind(Number(payload.sub), prod.id, qty, totalPrice, shipping_address).run();

  const created = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(meta.last_row_id).first<OrderRow>();
  return NextResponse.json(created, { status: 201 });
}

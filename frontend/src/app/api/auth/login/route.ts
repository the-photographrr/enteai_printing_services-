// POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { getDB } from '@/lib/cf';
import { compareSync } from 'bcryptjs';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ detail: 'Username and password required.' }, { status: 400 });

    const db = getDB(req);
    const user = await db.prepare(
      'SELECT id, username, email, role, phone, address, password FROM users WHERE username = ?'
    ).bind(username).first<{ id: number; username: string; email: string; role: string; phone: string; address: string; password: string }>();

    if (!user) return NextResponse.json({ detail: 'Invalid credentials.' }, { status: 401 });

    const valid = compareSync(password, user.password);
    if (!valid) return NextResponse.json({ detail: 'Invalid credentials.' }, { status: 401 });

    const token = await signToken({ sub: String(user.id), role: user.role, username: user.username });
    const { password: _pw, ...safeUser } = user;

    return NextResponse.json({ access: token, user: safeUser });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 });
  }
}

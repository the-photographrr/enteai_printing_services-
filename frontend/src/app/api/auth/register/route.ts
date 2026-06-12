// POST /api/auth/register
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/cf';
import { hashSync } from 'bcryptjs';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { username, password, email, phone } = await req.json();
    if (!username || !password || !email)
      return NextResponse.json({ detail: 'Username, password, and email are required.' }, { status: 400 });

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { detail: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ detail: 'Invalid email address format.' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ detail: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json({ detail: 'Password must contain at least one letter and one number.' }, { status: 400 });
    }

    const db = getDB(req);

    const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(username, email).first<{ id: number }>();
    if (existing) return NextResponse.json({ detail: 'Username or email already taken.' }, { status: 400 });

    const hashedPassword = hashSync(password, 10);
    const safeRole = 'customer'; // Strictly default to customer for public registration

    await db.prepare(
      'INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)'
    ).bind(username, email, hashedPassword, safeRole, phone || null).run();

    return NextResponse.json({ detail: 'User created successfully.' }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 });
  }
}

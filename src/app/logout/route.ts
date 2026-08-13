import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/login';
  if (value === '/logout' || value.startsWith('/logout?')) return '/login';
  return value;
}

function expiredCookie(name: string, isSecureRequest: boolean) {
  return {
    name,
    value: '',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    secure: isSecureRequest || name.startsWith('__Secure-') || name.startsWith('__Host-'),
    sameSite: 'lax',
  } as const;
}

async function clearLocalSession(request: NextRequest) {
  const cookieStore = await cookies();
  const destination = new URL(safeNextPath(request.nextUrl.searchParams.get('next')), request.url);
  const response = NextResponse.redirect(destination, { status: 303 });
  const isSecureRequest = request.nextUrl.protocol === 'https:';

  for (const cookie of cookieStore.getAll()) {
    response.cookies.set(expiredCookie(cookie.name, isSecureRequest));
  }

  response.headers.set('Clear-Site-Data', '"cookies", "storage"');
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

export async function GET(request: NextRequest) {
  return clearLocalSession(request);
}

export async function POST(request: NextRequest) {
  return clearLocalSession(request);
}

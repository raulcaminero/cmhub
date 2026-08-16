import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public pages intended for unauthenticated users
const PUBLIC_AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Root URL redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/cmhub' : '/login', request.url));
  }

  const isPublicAuthPage = PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));

  // If user is NOT logged in and trying to access a private route (/cmhub/*)
  if (!token && !isPublicAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user IS logged in and tries to access an unauthenticated auth page (/login, /register, etc.), redirect to dashboard
  if (token && isPublicAuthPage) {
    return NextResponse.redirect(new URL('/cmhub', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.ico$).*)'],
};

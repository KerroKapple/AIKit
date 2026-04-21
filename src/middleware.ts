import { NextRequest, NextResponse } from 'next/server';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/types';

const COOKIE_NAME = 'locale';

export function middleware(req: NextRequest) {
  const current = req.cookies.get(COOKIE_NAME)?.value;
  if (current && (LOCALES as readonly string[]).includes(current)) {
    return NextResponse.next();
  }
  const accept = req.headers.get('accept-language') ?? '';
  const preferred = (LOCALES as readonly string[]).find((l) => accept.toLowerCase().includes(l)) ?? DEFAULT_LOCALE;
  const res = NextResponse.next();
  res.cookies.set(COOKIE_NAME, preferred, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|favicon).*)'],
};

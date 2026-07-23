'use client';

import { usePathname } from 'next/navigation';

const PUBLIC_ROUTES = new Set([
  'login', 'register', 'verify-otp', 'privacy', 'terms', 'api', '_next', '',
]);

export function useOrgSlug(): string | null {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1 && !PUBLIC_ROUTES.has(segments[0])) {
    return segments[0];
  }
  return null;
}

export function useOrgPath(): (path: string) => string {
  const slug = useOrgSlug();
  return (path: string) => {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return slug ? `/${slug}${clean}` : clean;
  };
}

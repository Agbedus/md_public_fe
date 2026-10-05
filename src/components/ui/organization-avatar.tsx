'use client';

import { useState } from 'react';
import Image from 'next/image';

/** Shared workspace identity for navigation triggers and menu options. */
export function OrganizationAvatar({ name, logoUrl, size = 20 }: {
  name: string;
  logoUrl?: string | null;
  size?: 20 | 24;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-card-border bg-input-bg text-[10px] font-bold text-foreground ${size === 24 ? 'h-6 w-6' : 'h-5 w-5'}`}>
      {logoUrl && failedUrl !== logoUrl ? (
        <Image src={logoUrl} alt={`${name} logo`} fill sizes={`${size}px`} unoptimized className="object-contain" onError={() => setFailedUrl(logoUrl)} />
      ) : (
        name.trim().charAt(0).toUpperCase() || '?'
      )}
    </span>
  );
}

'use client';

import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import Link from 'next/link';
import { LinkProvider } from '@astryxdesign/core/Link';

export function AstryxProvider({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>
        {children}
      </LinkProvider>
    </Theme>
  );
}

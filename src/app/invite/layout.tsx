import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: 'Join a workspace',
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}

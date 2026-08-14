import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: 'Choose a workspace',
};

export default function NoOrganizationLayout({ children }: { children: React.ReactNode }) {
  return children;
}

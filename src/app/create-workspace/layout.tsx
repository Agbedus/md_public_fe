import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: 'Create a workspace',
};

export default function CreateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}

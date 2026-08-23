'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchOrganization } from '@/lib/org-actions';
import type { OrgBrief } from '@/types/organization';
import { WorkspaceLoadingSkeleton } from '@/components/ui/workspace-loading-skeleton';
import { toast } from '@/lib/toast';
import { FiBriefcase, FiLoader } from 'react-icons/fi';

export default function NoOrgPageClient({ organizations }: { organizations: OrgBrief[] }) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const handleSelect = async (orgId: string) => {
    setSwitching(orgId);
    const result = await switchOrganization(orgId);
    if (result.success && result.slug) {
      setSwitching(null);
      const destination = `/${result.slug}/dashboard`;
      router.prefetch(destination);
      startNavigation(() => router.push(destination));
      return;
    }
    setSwitching(null);
    toast.error(result.error || 'Could not open that workspace.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {(switching || isNavigating) && (
        <WorkspaceLoadingSkeleton isOverlay />
      )}
      <div className="max-w-md text-center space-y-6 px-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-foreground/[0.05] flex items-center justify-center">
          <FiBriefcase className="h-8 w-8 text-text-muted" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Organization</h1>
        <p className="text-text-muted leading-relaxed">
          You have access to multiple organizations. Choose one to get started.
        </p>
        <div className="space-y-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org.id)}
              disabled={switching !== null}
              className="w-full flex min-h-11 items-center gap-3 px-4 py-3 rounded-xl border border-card-border bg-card hover:bg-foreground/[0.03] transition-[transform,opacity,background-color] duration-150 text-left active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-lg bg-foreground/[0.08] flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                {org.role && (
                  <p className="text-xs text-text-muted capitalize">{org.role.replace('_', ' ')}</p>
                )}
              </div>
              {switching === org.id && (
                <FiLoader className="h-5 w-5 animate-spin text-text-muted" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

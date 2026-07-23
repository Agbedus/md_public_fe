'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { switchOrganization } from '@/lib/org-actions';
import type { OrgBrief } from '@/types/organization';

export default function NoOrgPageClient({ organizations }: { organizations: OrgBrief[] }) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSelect = async (orgId: string) => {
    setSwitching(orgId);
    await switchOrganization(orgId);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md text-center space-y-6 px-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-foreground/[0.05] flex items-center justify-center">
          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
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
              disabled={switching === org.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border bg-card-bg hover:bg-foreground/[0.03] transition-colors text-left disabled:opacity-50"
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
                <svg className="w-5 h-5 animate-spin text-text-muted" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

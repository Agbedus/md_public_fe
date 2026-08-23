'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { switchOrganization } from '@/lib/org-actions';
import { FiChevronDown, FiCheck, FiPlus } from 'react-icons/fi';
import type { OrgBrief } from '@/types/organization';
import { WorkspaceLoadingSkeleton } from '@/components/ui/workspace-loading-skeleton';
import { toast } from '@/lib/toast';

interface OrgSwitcherProps {
  organizations: OrgBrief[];
  currentOrgId: string | null | undefined;
  collapsed: boolean;
  contentVisibilityClass: string;
}

export default function OrgSwitcher({ organizations, currentOrgId, collapsed, contentVisibilityClass }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currentOrg = organizations.find(o => o.id === currentOrgId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrgId) return;
    setSwitching(orgId);
    setIsOpen(false);
    const result = await switchOrganization(orgId);
    if (result.success && result.slug) {
      setSwitching(null);
      const destination = `/${result.slug}/dashboard`;
      router.prefetch(destination);
      startNavigation(() => router.push(destination));
    } else {
      setSwitching(null);
      toast.error(result.error || 'Could not switch workspace.');
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {(switching || isNavigating) && (
        <WorkspaceLoadingSkeleton isOverlay />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching !== null}
        className={`flex min-h-11 items-center w-full py-2 rounded-xl text-text-muted hover:bg-foreground/[0.05] hover:text-foreground transition-[transform,color,background-color] duration-150 active:scale-[0.98] ${
          collapsed ? 'justify-center px-0' : 'justify-between px-6'
        }`}
      >
        <div className="flex items-center overflow-hidden">
          <div className="w-5 h-5 rounded bg-foreground/[0.08] flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
            {currentOrg ? currentOrg.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className={`ml-2 text-sm font-medium truncate ${contentVisibilityClass}`}>
            {currentOrg?.name || 'Select Org'}
          </span>
        </div>
        <FiChevronDown size={14} className={`${contentVisibilityClass} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute bottom-full mb-1 left-2 right-2 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-lg overflow-hidden z-50 ${collapsed ? 'hidden' : ''}`}
          >
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={`flex min-h-11 items-center w-full px-3 py-2 text-sm transition-[transform,color,background-color] duration-150 hover:bg-foreground/[0.05] active:scale-[0.98] ${
                  org.id === currentOrgId ? 'text-foreground font-medium' : 'text-text-muted'
                }`}
              >
                <div className="w-5 h-5 rounded bg-foreground/[0.08] flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 truncate">{org.name}</span>
                {org.id === currentOrgId && (
                  <FiCheck size={14} className="ml-auto text-emerald-500 flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-sidebar-border p-1.5">
              <button onClick={() => { setIsOpen(false); router.push('/create-workspace'); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-muted transition hover:bg-foreground/[0.05] hover:text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-500"><FiPlus size={13} /></span>
                Create workspace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { switchOrganization } from '@/lib/org-actions';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import type { OrgBrief } from '@/types/organization';

interface OrgSwitcherProps {
  organizations: OrgBrief[];
  currentOrgId: string | null | undefined;
  collapsed: boolean;
  contentVisibilityClass: string;
}

export default function OrgSwitcher({ organizations, currentOrgId, collapsed, contentVisibilityClass }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [currentOrg, setCurrentOrg] = useState<OrgBrief | undefined>(
    () => organizations.find(o => o.id === currentOrgId)
  );

  useEffect(() => {
    setCurrentOrg(organizations.find(o => o.id === currentOrgId));
  }, [currentOrgId, organizations]);

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
    setSwitching(true);
    setIsOpen(false);
    const result = await switchOrganization(orgId);
    setSwitching(false);
    if (result.success && result.slug) {
      router.push(`/${result.slug}/dashboard`);
    } else {
      window.location.reload();
    }
  };

  if (organizations.length <= 1 && currentOrg) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className={`flex items-center w-full py-2 rounded-xl text-text-muted hover:bg-foreground/[0.05] hover:text-foreground transition-colors ${
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
        {organizations.length > 1 && (
          <FiChevronDown size={14} className={`${contentVisibilityClass} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
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
                className={`flex items-center w-full px-3 py-2 text-sm transition-colors hover:bg-foreground/[0.05] ${
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

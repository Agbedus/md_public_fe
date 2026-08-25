"use client";

import React, { useState } from "react";
import { ShareButton } from '@/components/ui/sharing/share-button';
import SettingsForm from "@/components/ui/settings-form";
import OrganizationSettingsForm from "@/components/ui/organization-settings-form";
import type { OrganizationSettings } from "@/types/organization";

interface SettingsTabsProps {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
  };
  phone: string | null;
  initialSmsEnabled: boolean;
  canManageOrg: boolean;
  organization: OrganizationSettings | null;
}

type TabKey = "me" | "organization";

export default function SettingsTabs({ user, phone, initialSmsEnabled, canManageOrg, organization }: SettingsTabsProps) {
  const [tab, setTab] = useState<TabKey>("me");
  const showOrgTab = canManageOrg && organization != null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-3 py-4 sm:px-4 md:space-y-6 md:py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {showOrgTab ? "Your preferences, and this workspace's shared settings." : "Your personal preferences."}
          </p>
        </div>
        <ShareButton sourceSurface="settings" variant="icon" />
      </div>

      {showOrgTab && (
        <div
          role="tablist"
          aria-label="Settings"
          className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-foreground/[0.04] border border-card-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "me"}
            onClick={() => setTab("me")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "me" ? "bg-card text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
            }`}
          >
            My settings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "organization"}
            onClick={() => setTab("organization")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "organization" ? "bg-card text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
            }`}
          >
            Organization
          </button>
        </div>
      )}

      {tab === "me" || !showOrgTab ? (
        <SettingsForm user={user} phone={phone} initialSmsEnabled={initialSmsEnabled} />
      ) : (
        <OrganizationSettingsForm organization={organization!} />
      )}
    </div>
  );
}

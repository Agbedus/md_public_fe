"use client";

import React, { useState } from "react";
import { ShareButton } from '@/components/ui/sharing/share-button';
import SettingsForm from "@/components/ui/settings-form";
import OrganizationSettingsForm from "@/components/ui/organization-settings-form";
import type { OrganizationSettings } from "@/types/organization";

import { TabPill } from '@/components/ui/tab-pill';
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
    <div className="md-zen mx-auto max-w-2xl space-y-5 px-3 py-4 sm:px-4 md:space-y-6 md:py-8">
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
          className="inline-flex items-center gap-0.5 rounded-full bg-foreground/[0.05] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "me"}
            onClick={() => setTab("me")}
            className={`relative isolate min-h-9 rounded-full px-4 text-sm font-medium transition-colors ${
              tab === "me" ? "text-on-ink" : "text-text-muted hover:text-foreground"
            }`}
          >
            {tab === "me" && <TabPill id="settings-tab" />}
            My settings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "organization"}
            onClick={() => setTab("organization")}
            className={`relative isolate min-h-9 rounded-full px-4 text-sm font-medium transition-colors ${
              tab === "organization" ? "text-on-ink" : "text-text-muted hover:text-foreground"
            }`}
          >
            {tab === "organization" && <TabPill id="settings-tab" />}
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

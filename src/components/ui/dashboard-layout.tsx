'use client';

import React, { useState, createContext, useContext } from 'react';
import { NotificationProvider } from './notifications/notification-provider';
import { AnnouncementProvider } from './announcements/announcement-provider';
import { AnnouncementDrawer } from './announcements/announcement-drawer';
import { MobileNav } from './mobile-nav';
import { ConfirmationProvider } from '@/providers/confirmation-provider';
import { useGlobalActions } from '@/providers/global-action-provider';
import AssistantOrb from './assistant/assistant-orb';
import { OnboardingTour } from './onboarding/onboarding-tour';
import { SmsFeatureBanner } from './sms-feature-banner';

interface DashboardContextType {
  isMobileExpanded: boolean;
  setIsMobileExpanded: (v: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (v: boolean) => void;
  isCommandOpen: boolean;
  setIsCommandOpen: (v: boolean) => void;
  hideContentScroll: boolean;
  setHideContentScroll: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export default function DashboardLayout({
  sidebar,
  topnav,
  children,
  user,
  orgSlug,
  workspaceId,
  isOnboardingTourBlocked,
}: {
  sidebar: React.ReactNode;
  topnav: React.ReactNode;
  children: React.ReactNode;
  user?: any;
  orgSlug?: string;
  workspaceId?: string;
  isOnboardingTourBlocked?: boolean;
}) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [hideContentScroll, setHideContentScroll] = useState(false);
  const { isCommandOpen, setIsCommandOpen } = useGlobalActions();

  return (
    <DashboardContext.Provider value={{ 
        isMobileExpanded, 
        setIsMobileExpanded, 
        isDesktopCollapsed, 
        setIsDesktopCollapsed,
        isCommandOpen,
        setIsCommandOpen,
        hideContentScroll,
        setHideContentScroll
    }}>
      <NotificationProvider user={user} workspaceScope={orgSlug} workspaceId={workspaceId}>
        <AnnouncementProvider user={user} workspaceScope={orgSlug}>
          <ConfirmationProvider>
            <div className="relative flex h-dvh overflow-hidden bg-background md:h-screen">
              {/* Sidebar container */}
              <div className="z-30">
                  {sidebar}
              </div>

              {/* Main Content Area */}
              <div 
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative
                  ${isMobileExpanded ? 'md:translate-x-0 translate-x-24' : 'translate-x-0'}
                `}
              >
                {topnav}
                <div
                  data-dashboard-scroll
                  className={`w-full flex-1 overscroll-y-contain ${hideContentScroll ? 'overflow-hidden' : 'overflow-y-auto'} pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0`}
                >
                  {children}
                </div>
              </div>
              <MobileNav setIsCommandOpen={setIsCommandOpen} orgSlug={orgSlug} />
              <AnnouncementDrawer />
              <AssistantOrb />
              <SmsFeatureBanner userKey={user?.email || user?.id} />
              {(user?.email || user?.id) && (
                <OnboardingTour
                  userKey={user.email || user.id}
                  isInitiallyBlocked={isOnboardingTourBlocked}
                />
              )}
            </div>
          </ConfirmationProvider>
        </AnnouncementProvider>
      </NotificationProvider>
    </DashboardContext.Provider>
  );
}

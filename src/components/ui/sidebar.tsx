"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { useDashboard } from "./dashboard-layout";
import {
  FiHome,
  FiFileText,
  FiCalendar,
  FiSettings,
  FiLayers,
  FiCheckSquare,
  FiClock,
  FiLogOut,
  FiBriefcase,
  FiMapPin,
  FiUsers,
  FiBookOpen,
  FiInfo,
  FiSun,
  FiChevronDown,
  FiInbox,
  FiUser,
  FiMoreHorizontal,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { motion, AnimatePresence } from "framer-motion";

import { AboutModal } from "./about-modal";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import OrgSwitcher from "./org-switcher";
import { isOrgAdmin, canCreate } from "@/lib/org-permissions";
import { spring, springTap } from "@/lib/motion";
import { ShareButton } from "@/components/ui/sharing/share-button";
import { useLocation } from "@/providers/location-provider";
import { getSidebarCounts } from "@/app/lib/sidebar-actions";
import { workspaceCacheKey } from "@/lib/workspace-cache";
import { avatarStyle } from '@/lib/avatar-color';

interface OrgBrief {
  id: string;
  name: string;
}

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
    orgRole?: string;
  };
  organizations?: OrgBrief[];
  currentOrgId?: string | null;
  orgSlug?: string;
}

interface SidebarMenuItem {
  href: string;
  icon: IconType;
  label: string;
  tourId?: string;
  count?: number;
  showsAttendanceStatus?: boolean;
}

const Sidebar = ({ user, organizations, currentOrgId, orgSlug }: SidebarProps) => {
  const pathname = usePathname();
  const {
    isMobileExpanded,
    setIsMobileExpanded,
    isDesktopCollapsed,
    setIsDesktopCollapsed,
  } = useDashboard();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // The account menu closes on an outside click or Escape.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setIsUserMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen]);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  const { attendanceState } = useLocation();
  const workspaceScope = orgSlug || currentOrgId;
  const { data: sidebarCounts } = useSWR(
    workspaceScope ? workspaceCacheKey("sidebar-counts", workspaceScope) : null,
    getSidebarCounts,
    {
      revalidateOnFocus: true,
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    },
  );
  const version = "0.1.0";

  // Existing expansion logic
  const isExpandedMobile = isMobileExpanded;
  const isExpandedDesktop = !isDesktopCollapsed;
  const isSidebarCollapsed = !isExpandedMobile && !isExpandedDesktop;

  /* ---------------- Styles ---------------- */

  const widthClass = `${isExpandedMobile ? "w-64" : "w-20"} md:${
    isExpandedDesktop ? "w-64" : "w-20"
  }`;

  // Dynamic alignment based on sidebar state
  const itemAlignmentClass = isSidebarCollapsed ? "justify-center px-0" : "justify-start px-6";

  const contentVisibilityClass = `${isExpandedMobile ? "block" : "hidden"} md:${
    isExpandedDesktop ? "block" : "hidden"
  }`;

  const inverseContentVisibilityClass = `${isExpandedMobile ? "hidden" : "block"} md:${
    isExpandedDesktop ? "hidden" : "block"
  }`;

  // Mobile: smaller spacing, Desktop: normal spacing
  const iconSpacingClass = `${isExpandedMobile ? "gap-3 md:gap-4" : ""} md:${
    isExpandedDesktop ? "gap-4" : ""
  }`;

  // Mobile: smaller icons, Desktop: normal icons
  const iconSizeClass = `${isExpandedMobile ? "text-sm md:text-base" : "text-lg md:text-xl"} md:${
    isExpandedDesktop ? "text-base" : "text-xl"
  }`;

  /* ---------- Header ---------- */

  const headerClass = `
    h-20 flex items-center border-b border-card-border transition-all duration-300
    ${isSidebarCollapsed ? "justify-center px-0" : "justify-start px-6"}
  `;

  const headerInnerClass = `
    flex items-center w-full gap-2
    ${isExpandedMobile || isExpandedDesktop ? "justify-between" : "justify-center"}
  `;

  /* ---------- Menu container ---------- */
  const menuContainerClass = `
    flex-1 overflow-y-auto overflow-x-hidden
    py-4 px-0.5
  `;

  // Mobile: smaller padding, Desktop: normal padding
  const baseLinkClasses =
    "flex items-center py-1.5 md:py-2 rounded-full font-light text-sm whitespace-nowrap transition-[background-color,color,border-color,transform] duration-200 ease-out hover:bg-foreground/[0.045] hover:text-foreground active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-colors";

  // The current page is marked in the brand accent, the same way for every
  // item: a soft accent pill, as in the design tokens.
  const activeLinkClasses =
    "bg-accent/12 text-accent-text font-medium";

  const inactiveLinkClasses = "text-text-muted";

  /* ---------------- Menus ---------------- */

  const mainMenuItems: SidebarMenuItem[] = [
    { href: "/dashboard", icon: FiHome, label: "Dashboard", tourId: "dashboard" },
    { href: "/tasks", icon: FiCheckSquare, label: "Tasks", tourId: "tasks", count: sidebarCounts?.tasks },
    { href: "/projects", icon: FiBriefcase, label: "Projects", tourId: "projects", count: sidebarCounts?.projects },
    { href: "/notes", icon: FiFileText, label: "Notes", tourId: "notes", count: sidebarCounts?.notes },
    { href: "/calendar", icon: FiCalendar, label: "Calendar", tourId: "calendar" },
  ];

  const toolMenuItems: SidebarMenuItem[] = [
    { href: "/team", icon: FiUsers, label: "Team", tourId: "team" },
    { href: "/attendance", icon: FiMapPin, label: "Attendance", tourId: "attendance", showsAttendanceStatus: true },
    { href: "/focus", icon: FiClock, label: "Focus Mode" },
  ];

  const systemMenuItems: SidebarMenuItem[] = [
    { href: "/wiki", icon: FiBookOpen, label: "Wiki", tourId: "wiki" },
  ];

  const renderMenuItem = (item: SidebarMenuItem) => {
    const href = orgSlug ? `/${orgSlug}${item.href}` : item.href;
    const isActive = pathname === href || pathname.startsWith(href + '/');
    const isAttendanceLive = attendanceState === 'CLOCKED_IN';
    // Recorded today: clocked in now, or already clocked out.
    const isAttendanceRecorded = isAttendanceLive || attendanceState === 'CLOCKED_OUT';
    const hasTrailingBadge = (typeof item.count === "number" && item.count > 0) || item.showsAttendanceStatus;
    return (
      <div
        key={item.href}
        className="group/item"
      >
        <Link
          href={href}
          prefetch={true}
          data-tour={item.tourId}
          className={`${baseLinkClasses} ${
 isActive ? activeLinkClasses : inactiveLinkClasses
 } ${itemAlignmentClass} ${iconSpacingClass} ${
 hasTrailingBadge && !isSidebarCollapsed ? "!pr-1.5 md:!pr-2" : ""
 }`}
        >
          <item.icon
            className={`flex-shrink-0 ${iconSizeClass} ${
 isActive ? "text-accent-text" : "text-text-muted/55 group-hover/item:text-text-muted"
 } transition-[color,transform] duration-200 ease-out motion-safe:group-hover/item:translate-x-0.5 motion-safe:group-hover/item:scale-[1.04] motion-reduce:transform-none`}
          />
          <span
            className={`${contentVisibilityClass} transition-[color,transform] duration-200 ease-out motion-safe:group-hover/item:translate-x-0.5 motion-reduce:transform-none`}
          >
            {item.label}
          </span>
          {typeof item.count === "number" && item.count > 0 && (
            // The wrapper takes the show/hide class, so the badge keeps its own
            // centring grid; on the blue active fill the number is always white.
            <span className={`${contentVisibilityClass} ml-auto h-5 leading-none`}>
              <span
                className={`md-count align-top ${isActive ? "bg-accent text-white" : "bg-foreground/[0.05] text-text-muted"}`}
                aria-label={`${item.count} ${item.label.toLowerCase()}`}
              >
                {item.count > 99 ? "99+" : item.count}
              </span>
            </span>
          )}
          {item.showsAttendanceStatus && (
            <span
              className={`${contentVisibilityClass} ml-auto`}
              role="status"
              aria-label={isAttendanceLive ? "Clocked in" : isAttendanceRecorded ? "Attendance recorded today" : "No attendance recorded today"}
              title={isAttendanceLive ? "Clocked in" : isAttendanceRecorded ? "Attendance recorded today" : "No attendance recorded today"}
            >
              {/* Same 20px circle as the count badges, so the column lines up. */}
              <span className={`relative grid h-5 w-5 place-items-center rounded-full ${isAttendanceRecorded ? "bg-accent/15" : "bg-foreground/[0.05]"}`}>
                {isAttendanceLive && (
                  <span
                    aria-hidden="true"
                    className="absolute h-2 w-2 rounded-full bg-accent/50 motion-safe:animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite]"
                  />
                )}
                <span className={`relative h-2 w-2 rounded-full ${isAttendanceRecorded ? "bg-accent" : "bg-text-muted/40"}`} />
              </span>
            </span>
          )}
        </Link>
      </div>
    );
  };

  return (
    <div
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col h-full ${widthClass}`}
    >
      {/* ---------- Header ---------- */}
      <div className={headerClass}>
        <div className={headerInnerClass}>
          <motion.button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setIsMobileExpanded(!isMobileExpanded);
              } else {
                setIsDesktopCollapsed(!isDesktopCollapsed);
              }
            }}
            whileHover={{ scale: 1.05, transition: spring }}
            whileTap={{ scale: 0.93, transition: springTap }}
            className="flex items-center cursor-pointer group/logo"
            title={isExpandedDesktop ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <div className="w-10 h-10 p-1 flex items-center justify-center shrink-0">
              <Image
                src="/logo.svg"
                alt="MyndDesk"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            </div>
          </motion.button>

          {!isSidebarCollapsed && (
            <div className="flex items-center gap-1 ml-auto">
              <ThemeToggle minimal />
            </div>
          )}
        </div>
      </div>

      {/* ---------- Menu ---------- */}
      <div className={menuContainerClass}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-full flex items-center justify-between px-6 mb-2 group/header focus:outline-none ${!contentVisibilityClass.includes('hidden') ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <h3 className={`text-[11px] font-semibold text-text-muted ${contentVisibilityClass}`}>
            Menu
          </h3>
          <motion.div
            initial={false}
            animate={{ rotate: isMenuOpen ? 0 : -90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`${contentVisibilityClass} text-text-muted opacity-60 group-hover/header:opacity-100`}
          >
            <FiChevronDown size={14} />
          </motion.div>
        </button>
        
        <AnimatePresence initial={false}>
          {(isMenuOpen || isSidebarCollapsed) && (
            <motion.div
              initial={isExpandedMobile || isExpandedDesktop ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
              className="space-y-1"
            >
              <nav className="space-y-1.5 px-2">
                {mainMenuItems.map(renderMenuItem)}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          className={`w-full flex items-center justify-between px-6 mt-6 mb-2 group/header focus:outline-none ${!contentVisibilityClass.includes('hidden') ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <h3 className={`text-[11px] font-semibold text-text-muted ${contentVisibilityClass}`}>
            Tools
          </h3>
          <motion.div
            initial={false}
            animate={{ rotate: isToolsOpen ? 0 : -90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`${contentVisibilityClass} text-text-muted opacity-60 group-hover/header:opacity-100`}
          >
            <FiChevronDown size={14} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {(isToolsOpen || isSidebarCollapsed) && (
            <motion.div
              initial={isExpandedMobile || isExpandedDesktop ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
              className="space-y-1"
            >
              <nav className="space-y-1.5 px-2">
                {toolMenuItems.map(renderMenuItem)}

                {user?.roles?.includes("super_admin") && (
                  renderMenuItem({ href: "/users", icon: FiUsers, label: "System Users" })
                )}
                {/* Every collaborator can read the client list; only MANAGER and
                    above can add or change one, which the page itself gates. */}
                {canCreate({ roles: user?.roles, orgRole: user?.orgRole }) && (
                  renderMenuItem({ href: "/clients", icon: FiBriefcase, label: "Clients" })
                )}
                {/* This is the time-off *approvals* screen, so it stays at the
                    admin tier. Members request time off from the calendar. */}
                {isOrgAdmin({ roles: user?.roles, orgRole: user?.orgRole }) && (
                  renderMenuItem({ href: "/time-off", icon: FiSun, label: "Time Off" })
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsSystemOpen(!isSystemOpen)}
          className={`w-full flex items-center justify-between px-6 mt-6 mb-2 group/header focus:outline-none ${!contentVisibilityClass.includes('hidden') ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <h3 className={`text-[11px] font-semibold text-text-muted ${contentVisibilityClass}`}>
            System
          </h3>
          <motion.div
            initial={false}
            animate={{ rotate: isSystemOpen ? 0 : -90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`${contentVisibilityClass} text-text-muted opacity-60 group-hover/header:opacity-100`}
          >
            <FiChevronDown size={14} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {(isSystemOpen || isSidebarCollapsed) && (
            <motion.div
              initial={isExpandedMobile || isExpandedDesktop ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
              className="space-y-1"
            >
              <nav className="space-y-1.5 px-2">
                {systemMenuItems.map(renderMenuItem)}
                {user?.roles?.includes("super_admin") && (
                  renderMenuItem({ href: "/waitlist", icon: FiInbox, label: "Waitlist" })
                )}
                <ShareButton
                  sourceSurface="sidebar"
                  variant="sidebar"
                  isCollapsed={isSidebarCollapsed}
                />
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="py-3 border-t border-sidebar-border space-y-3">
        {organizations && organizations.length > 0 && (
          <div className="px-2">
            <OrgSwitcher
              organizations={organizations}
              currentOrgId={currentOrgId}
              collapsed={isSidebarCollapsed}
              contentVisibilityClass={contentVisibilityClass}
            />
          </div>
        )}
        {user && (
          <div
            ref={userMenuRef}
            className={`relative flex items-center gap-2 ${isSidebarCollapsed ? "justify-center px-0" : "px-3"}`}
          >
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              className={`group/user flex min-w-0 flex-1 items-center gap-3 rounded-full p-1.5 text-left transition-colors hover:bg-foreground/[0.05] ${isSidebarCollapsed ? "flex-none" : "pr-3"}`}
            >
              <span className="relative h-8 w-8 shrink-0">
                {user.image ? (
                  <Image src={user.image} alt={user.name || "User"} fill className="rounded-full object-cover" />
                ) : (
                  <span style={avatarStyle(user.name || user.email)} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-sm font-bold text-foreground">
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </span>
                )}
              </span>
              <span className={`min-w-0 flex-1 ${contentVisibilityClass}`}>
                <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
                <span className="block truncate text-xs capitalize text-text-muted">
                  {user.orgRole ? user.orgRole.replace("_", " ") : user.roles?.[0]?.replace("_", " ") || "Member"}
                </span>
              </span>
              <FiMoreHorizontal className={`shrink-0 text-text-muted ${contentVisibilityClass}`} aria-hidden="true" />
            </button>

            {!isSidebarCollapsed && (
              <Link
                href={orgSlug ? `/${orgSlug}/settings` : "/settings"}
                data-tour="settings"
                title="Settings"
                aria-label="Settings"
                className="group/settings flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <FiSettings size={17} className="transition-transform duration-300 group-hover/settings:rotate-45" />
              </Link>
            )}

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute bottom-full left-3 z-50 mb-2 w-56 origin-bottom-left rounded-3xl border border-card-border bg-card p-1"
                >
                  <Link
                    role="menuitem"
                    href={orgSlug ? `/${orgSlug}/profile` : "/profile"}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex min-h-10 items-center gap-3 rounded-full px-3.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.05]"
                  >
                    <FiUser className="text-text-muted" /> Profile
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setIsUserMenuOpen(false); setIsAboutOpen(true); }}
                    className="flex min-h-10 w-full items-center gap-3 rounded-full px-3.5 text-left text-sm text-foreground transition-colors hover:bg-foreground/[0.05]"
                  >
                    <FiInfo className="text-text-muted" /> About MyndDesk
                  </button>
                  <form action="/logout" method="get">
                    <button
                      role="menuitem"
                      type="submit"
                      className="flex min-h-10 w-full items-center gap-3 rounded-full px-3.5 text-left text-sm text-danger-text transition-colors hover:bg-danger/10"
                    >
                      <FiLogOut /> Sign out
                    </button>
                  </form>
                  <div className="mt-1 flex items-center justify-between border-t border-card-border px-3.5 pb-1.5 pt-2.5 text-[11px] text-text-muted">
                    <span>v{version}</span>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning-text">Beta</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="px-6 pb-2 flex items-center gap-3 text-[11px] text-text-muted">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span className="text-text-muted/40">·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        )}

        <AboutModal 
            isOpen={isAboutOpen} 
            onClose={() => setIsAboutOpen(false)} 
            version={version} 
        />

      </div>
    </div>
  );
};

export default Sidebar;

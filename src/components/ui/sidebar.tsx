"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

import { logout } from "@/app/lib/actions";
import { AboutModal } from "./about-modal";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import OrgSwitcher from "./org-switcher";
import { canManageOrg } from "@/lib/org-permissions";

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

const Sidebar = ({ user, organizations, currentOrgId, orgSlug }: SidebarProps) => {
  const pathname = usePathname();
  const {
    isMobileExpanded,
    setIsMobileExpanded,
    isDesktopCollapsed,
    setIsDesktopCollapsed,
  } = useDashboard();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isSystemOpen, setIsSystemOpen] = useState(true);
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
    "flex items-center py-1.5 md:py-2 rounded-lg transition-all duration-200 font-light text-sm hover:bg-foreground/[0.05] hover:text-foreground whitespace-nowrap";

  const activeLinkClasses =
    "bg-foreground/[0.07] text-foreground border border-card-border font-medium";

  const inactiveLinkClasses = "text-text-muted";

  /* ---------------- Menus ---------------- */

  const mainMenuItems = [
    { href: "/dashboard", icon: FiHome, label: "Dashboard", color: "text-blue-400" },
    { href: "/tasks", icon: FiCheckSquare, label: "Tasks", color: "text-purple-400" },
    { href: "/projects", icon: FiBriefcase, label: "Projects", color: "text-pink-400" },
    { href: "/notes", icon: FiFileText, label: "Notes", color: "text-yellow-400" },
    { href: "/calendar", icon: FiCalendar, label: "Calendar", color: "text-green-400" },
  ];

  const toolMenuItems = [
    { href: "/team", icon: FiUsers, label: "Team", color: "text-teal-400" },
    { href: "/attendance", icon: FiMapPin, label: "Attendance", color: "text-sky-400" },
    { href: "/focus", icon: FiClock, label: "Focus Mode", color: "text-orange-400" },
  ];

  const systemMenuItems = [
    { href: "/wiki", icon: FiBookOpen, label: "Wiki", color: "text-emerald-400" },
  ];

  const renderMenuItem = (item: any) => {
    const href = orgSlug ? `/${orgSlug}${item.href}` : item.href;
    const isActive = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        key={item.href}
        href={href}
        className={`${baseLinkClasses} ${
          isActive ? activeLinkClasses : inactiveLinkClasses
        } ${itemAlignmentClass} ${iconSpacingClass}`}
      >
        <item.icon className={`flex-shrink-0 ${iconSizeClass} ${item.color}`} />
        <span className={contentVisibilityClass}>{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      className={`glass border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col h-full ${widthClass}`}
    >
      {/* ---------- Header ---------- */}
      <div className={headerClass}>
        <div className={headerInnerClass}>
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setIsMobileExpanded(!isMobileExpanded);
              } else {
                setIsDesktopCollapsed(!isDesktopCollapsed);
              }
            }}
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            title={isExpandedDesktop ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <div className="w-10 h-10 p-1 bg-foreground/[0.04] rounded-lg border border-card-border flex items-center justify-center shrink-0">
              <Image 
                src="/logo.svg" 
                alt="MD Logo" 
                width={32} 
                height={32} 
                className="w-8 h-8 object-contain"
              />
            </div>
          </button>

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
          <h3 className={`text-[11px] font-semibold text-text-muted uppercase tracking-wider ${contentVisibilityClass}`}>
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
          <h3 className={`text-[11px] font-semibold text-text-muted uppercase tracking-wider ${contentVisibilityClass}`}>
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
                  renderMenuItem({ href: "/users", icon: FiUsers, label: "System Users", color: "text-teal-400" })
                )}
                {canManageOrg({ roles: user?.roles, orgRole: user?.orgRole }) && (
                  renderMenuItem({ href: "/clients", icon: FiBriefcase, label: "Clients", color: "text-violet-400" })
                )}
                {canManageOrg({ roles: user?.roles, orgRole: user?.orgRole }) && (
                  renderMenuItem({ href: "/time-off", icon: FiSun, label: "Time Off", color: "text-amber-400" })
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsSystemOpen(!isSystemOpen)}
          className={`w-full flex items-center justify-between px-6 mt-6 mb-2 group/header focus:outline-none ${!contentVisibilityClass.includes('hidden') ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <h3 className={`text-[11px] font-semibold text-text-muted uppercase tracking-wider ${contentVisibilityClass}`}>
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
                  renderMenuItem({ href: "/waitlist", icon: FiInbox, label: "Waitlist", color: "text-indigo-400" })
                )}
                <button
                  onClick={() => setIsAboutOpen(true)}
                  className={`${baseLinkClasses} ${inactiveLinkClasses} ${itemAlignmentClass} ${iconSpacingClass} w-full`}
                >
                  <FiInfo className={`flex-shrink-0 ${iconSizeClass} text-text-muted`} />
                  <span className={contentVisibilityClass}>About Platform</span>
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="py-3 border-t border-sidebar-border space-y-3">
        {organizations && organizations.length > 0 && (
          <OrgSwitcher
            organizations={organizations}
            currentOrgId={currentOrgId}
            collapsed={isSidebarCollapsed}
            contentVisibilityClass={contentVisibilityClass}
          />
        )}
        {user && (
          <div className={`flex items-center justify-between w-full py-2 ${isSidebarCollapsed ? "px-0 justify-center" : "px-6"}`}>
            <div className="flex items-center">
              <div className="relative w-8 h-8 flex-shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    fill
                    className="rounded-full object-cover border border-emerald-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className={`ml-3 overflow-hidden ${contentVisibilityClass}`}>
                <p className="text-sm text-foreground font-medium truncate">{user.name}</p>
                <p className="text-xs text-text-muted capitalize">
                  {user.orgRole ? user.orgRole.replace("_", " ") : user.roles?.[0]?.replace("_", " ") || "Member"}
                </p>
              </div>
            </div>

            {!isSidebarCollapsed && (
              <Link 
                href={orgSlug ? `/${orgSlug}/settings` : "/settings"}
                className="p-2 hover:bg-foreground/[0.05] rounded-lg transition-colors text-text-muted hover:text-foreground shrink-0 ml-auto flex items-center justify-center"
                title="Settings"
              >
                <FiSettings size={16} className="text-text-muted hover:text-foreground transition-colors" />
              </Link>
            )}
          </div>
        )}

        <form action={logout} className="w-full">
          <button
            type="submit"
            className={`flex items-center w-full py-2 rounded-xl text-text-muted hover:bg-red-500/10 hover:text-red-400 ${itemAlignmentClass} ${iconSpacingClass}`}
          >
            <FiLogOut className={iconSizeClass} />
            <span className={contentVisibilityClass}>Sign Out</span>
          </button>
        </form>

        <div className={`py-2 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between px-6"}`}>
            <span className={`text-[11px] font-medium text-text-muted uppercase tracking-wider leading-none ${contentVisibilityClass}`}>
                v{version}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-500 uppercase tracking-wider leading-none">
                Beta
            </span>
        </div>

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
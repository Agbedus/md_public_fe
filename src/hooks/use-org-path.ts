"use client";

import { usePathname } from "next/navigation";
import { orgPath, slugFromPath } from "@/lib/org-path";

/**
 * Client-side hook that returns a path builder bound to whichever org
 * slug is currently in the URL. Lets client components and event
 * handlers (command menus, keybindings) construct org-scoped URLs
 * without each one having to fish the slug out of the URL itself.
 */
export function useOrgPath() {
  const pathname = usePathname();
  const slug = slugFromPath(pathname) ?? undefined;
  return {
    slug,
    path: (...segments: Array<string | number | undefined | null>) => orgPath(slug, ...segments),
  };
}

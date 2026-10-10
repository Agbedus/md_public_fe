"use client";

import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { useOrgPath } from "@/hooks/use-org-path";

/**
 * What a chart shows when it has nothing to plot. A chart drawn from no data
 * (one bar filling the card, a full ring) looks like a real result, so say so
 * in words instead and offer the one step that would give it data.
 *
 * `actionHref` is an org-relative path such as "projects"; it is resolved
 * against the org in the URL.
 */
export function ChartEmpty({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  const { path } = useOrgPath();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="max-w-[26ch] text-sm text-text-muted text-balance">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={path(actionHref)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {actionLabel}
          <FiArrowRight aria-hidden className="text-xs" />
        </Link>
      )}
    </div>
  );
}

export default ChartEmpty;

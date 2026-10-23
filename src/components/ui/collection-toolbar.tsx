import type { ReactNode } from "react";

interface CollectionToolbarProps {
  label: string;
  search: ReactNode;
  filters?: ReactNode;
  tools: ReactNode;
  scrollArea?: "toolbar" | "filters";
  className?: string;
}

/** A single scrollable row: controls retain their size instead of wrapping or clipping. */
export function CollectionToolbar({
  label,
  search,
  filters,
  tools,
  scrollArea = "toolbar",
  className = "",
}: CollectionToolbarProps) {
  const scrollFilters = scrollArea === "filters";
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={scrollFilters ? undefined : 0}
      className={`min-w-0 max-w-full rounded-2xl pb-2 ${scrollFilters ? "" : "overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 custom-scrollbar"} ${className}`}
    >
      <div className={`flex items-center p-1 ${scrollFilters ? "w-full min-w-0 gap-2 sm:gap-3" : "w-max min-w-full gap-3"}`}>
        <div className={scrollFilters ? "w-24 shrink-0 sm:w-48 lg:w-64" : "w-56 shrink-0 sm:w-64"}>{search}</div>
        {filters && (
          <div
            role={scrollFilters ? "region" : undefined}
            aria-label={scrollFilters ? `${label} filters` : undefined}
            tabIndex={scrollFilters ? 0 : undefined}
            className={scrollFilters ? "min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 custom-scrollbar" : "flex shrink-0 items-center gap-2"}
          >
            {scrollFilters ? <div className="flex w-max items-center gap-2">{filters}</div> : filters}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2 pl-1">
          {tools}
        </div>
      </div>
    </div>
  );
}

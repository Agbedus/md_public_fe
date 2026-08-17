"use client";
import { FiGitBranch } from "react-icons/fi";
import { EmptyState } from "@/components/ui/empty-state";

export default function DecisionsPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[1600px] items-center justify-center px-3 py-4 sm:px-4 md:min-h-screen md:py-8">
      <EmptyState
        icon={FiGitBranch}
        title="Decisions"
        description="Your decision logs will appear here."
      />
    </div>
  );
}

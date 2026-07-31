"use client";
import { FiGitBranch } from "react-icons/fi";
import { EmptyState } from "@/components/ui/empty-state";

export default function DecisionsPage() {
  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen flex items-center justify-center">
      <EmptyState
        icon={FiGitBranch}
        title="Decisions"
        description="Your decision logs will appear here."
      />
    </div>
  );
}

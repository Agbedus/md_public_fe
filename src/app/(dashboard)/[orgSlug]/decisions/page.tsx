"use client";
import { FaCodeBranch } from "react-icons/fa";

export default function DecisionsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <FaCodeBranch className="text-6xl text-violet-400 mb-4" />
      <h1 className="text-2xl font-semibold text-white">Decisions</h1>
      <p className="text-slate-400 text-sm mt-2">Your decision logs will appear here.</p>
    </div>
  );
}

import { CustomSelect } from "@/components/ui/inputs/custom-select";
import React from 'react';
import { statusMapping } from "@/types/task";
import { FiCheck } from 'react-icons/fi';

export default function TaskFormFields() {
    return (
        <>
            <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary">Task Name</label>
                <input
                    type="text"
                    name="name"
                    className="block w-full bg-foreground/[0.03] border border-card-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all sm:text-sm"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary">Description</label>
                <textarea
                    name="description"
                    className="block w-full bg-foreground/[0.03] border border-card-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all sm:text-sm"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-text-secondary">Status</label>
                <CustomSelect
                  label="Status"
                  name="status"
                  options={[...(Object.entries(statusMapping).map(([key, value]) => (
                  ({ value: String(key), label: String(value ?? '') })
                  )))]}
                  className="w-full"
                  triggerClassName="w-full bg-foreground/[0.03] border border-card-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all sm:text-sm"
                />
            </div>
            <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            name="qa_required"
                            value="true"
                            className="peer md-check"
                        />
                        <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                    <span className="text-xs font-bold text-text-muted group-hover:text-foreground transition-colors">QA required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            name="review_required"
                            value="true"
                            className="peer md-check"
                        />
                        <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                    <span className="text-xs font-bold text-text-muted group-hover:text-foreground transition-colors">Review required</span>
                </label>
            </div>
            <div className="space-y-2">
                <label htmlFor="depends_on_id" className="block text-sm font-medium text-text-secondary">Depends on (task ID)</label>
                <input
                    type="number"
                    name="depends_on_id"
                    className="block w-full bg-foreground/[0.03] border border-card-border rounded-md py-2 px-3 text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all sm:text-sm"
                    placeholder="Task ID..."
                />
            </div>
        </>
    );
}
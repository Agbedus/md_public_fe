import React from 'react';
import { statusMapping } from "@/types/task";
import { FiCheck } from 'react-icons/fi';

export default function TaskFormFields() {
    return (
        <>
            <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-300">Task Name</label>
                <input
                    type="text"
                    name="name"
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md  py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                    name="description"
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md  py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-slate-300">Status</label>
                <select
                    name="status"
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md  py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    {Object.entries(statusMapping).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            name="qa_required"
                            value="true"
                            className="peer h-4 w-4 appearance-none rounded border border-slate-700 bg-slate-800 checked:bg-purple-500/40 checked:border-purple-400 transition-all"
                        />
                        <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-purple-400 transition-colors uppercase tracking-wider">QA Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            name="review_required"
                            value="true"
                            className="peer h-4 w-4 appearance-none rounded border border-slate-700 bg-slate-800 checked:bg-blue-500/40 checked:border-blue-400 transition-all"
                        />
                        <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors uppercase tracking-wider">Review Required</span>
                </label>
            </div>
            <div className="space-y-2">
                <label htmlFor="depends_on_id" className="block text-sm font-medium text-slate-300">Depends On (Task ID)</label>
                <input
                    type="number"
                    name="depends_on_id"
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md  py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Task ID..."
                />
            </div>
        </>
    );
}
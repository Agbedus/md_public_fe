'use client';

import React, { useState } from 'react';
import { createTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { CustomDatePicker } from '@/components/ui/inputs/custom-date-picker';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';

export default function TaskForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('TODO');
  const [qaRequired, setQaRequired] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [dependsOn, setDependsOn] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (dueDate) {
      formData.append('dueDate', format(dueDate, 'yyyy-MM-dd'));
    }
    formData.append('priority', priority);
    formData.append('status', status);
    formData.append('qa_required', qaRequired.toString());
    formData.append('review_required', reviewRequired.toString());
    if (dependsOn) {
      formData.append('depends_on_id', dependsOn);
    }

    try {
      await createTask(formData);
      toast.success('Task created successfully!');
      setName('');
      setDescription('');
      setDueDate(null);
      setPriority('medium');
      setStatus('TODO');
      setQaRequired(false);
      setReviewRequired(false);
      setDependsOn('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Task Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full p-2 border border-slate-700 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border border-slate-700 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Due Date</label>
          <CustomDatePicker
            value={dueDate}
            onChange={setDueDate}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full p-2 border border-slate-700 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none h-[42px]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 border border-slate-700 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none h-[42px]"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="QA">QA</option>
          <option value="REVIEW">Review</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      <div className="flex items-center gap-6 py-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              checked={qaRequired}
              onChange={(e) => setQaRequired(e.target.checked)}
              className="peer h-4 w-4 appearance-none rounded border border-slate-700 bg-slate-800 checked:bg-purple-500/40 checked:border-purple-400 transition-all"
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
          <span className="text-xs font-bold text-slate-400 group-hover:text-purple-400 transition-colors uppercase tracking-wider">QA Required</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
              className="peer h-4 w-4 appearance-none rounded border border-slate-700 bg-slate-800 checked:bg-blue-500/40 checked:border-blue-400 transition-all"
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-400 rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
          <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors uppercase tracking-wider">Review Required</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Depends On (Task ID)</label>
        <input
          type="number"
          value={dependsOn}
          onChange={(e) => setDependsOn(e.target.value)}
          placeholder="e.g. 123"
          className="w-full p-2 border border-slate-700 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  );
}
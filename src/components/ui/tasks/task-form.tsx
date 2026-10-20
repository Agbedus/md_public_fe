'use client';

import React, { useState } from 'react';
import { createTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { CustomDatePicker } from '@/components/ui/inputs/custom-date-picker';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { FiCheck } from 'react-icons/fi';

import { BusyIcon } from '@/components/ui/busy-icon';
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
      const result = await createTask(formData);
      if (!result?.success) throw new Error(result?.error || 'Failed to create task.');
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
        <label className="block text-sm font-medium mb-1 text-foreground">Task Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full p-2 rounded-md border border-card-border bg-foreground/[0.03] text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 rounded-md border border-card-border bg-foreground/[0.03] text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Due Date</label>
          <CustomDatePicker
            value={dueDate}
            onChange={setDueDate}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full p-2 rounded-md border border-card-border bg-foreground/[0.03] text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all h-[42px]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 rounded-md border border-card-border bg-foreground/[0.03] text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all h-[42px]"
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
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
              className="peer md-check"
            />
            <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </div>
          <span className="text-xs font-bold text-text-muted group-hover:text-foreground transition-colors">Review required</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">Depends on (task ID)</label>
        <input
          type="number"
          value={dependsOn}
          onChange={(e) => setDependsOn(e.target.value)}
          placeholder="e.g. 123"
          className="w-full p-2 rounded-md border border-card-border bg-foreground/[0.03] text-foreground placeholder:text-text-muted focus:outline-none focus:bg-foreground/[0.06] transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="md-btn md-btn-primary w-full"
      >
        {loading ? 'Creating…' : 'Create task'} <span className="md-btn-chip"><BusyIcon state={loading ? 'loading' : 'idle'} icon={<FiCheck />} /></span>

      </button>
    </form>
  );
}

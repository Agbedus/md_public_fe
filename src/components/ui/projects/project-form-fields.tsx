'use client';

import React, { useState } from 'react';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import { Client } from '@/types/client';
import { Combobox } from "@/components/ui/combobox";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { CustomNumberInput } from "@/components/ui/inputs/custom-number-input";

interface ProjectFormFieldsProps {
  defaultValues?: Partial<Project>;
  users: User[];
  clients: Client[];
}

export function ProjectFormFields({ defaultValues, users, clients }: ProjectFormFieldsProps) {
  const [selectedOwner, setSelectedOwner] = useState<string | number | null>(
    defaultValues?.ownerId || null
  );
  const [selectedClient, setSelectedClient] = useState<string | number | null>(
    defaultValues?.clientId || null
  );
  
  const [startDate, setStartDate] = useState<Date | null>(defaultValues?.startDate ? new Date(defaultValues.startDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(defaultValues?.endDate ? new Date(defaultValues.endDate) : null);
  const [budget, setBudget] = useState<number | ''>(defaultValues?.budget || '');
  const [spent, setSpent] = useState<number | ''>(defaultValues?.spent || '');

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Operational Foundation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label htmlFor="name" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Mission Designation *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              defaultValue={defaultValues?.name}
              className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label htmlFor="key" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Project Key
            </label>
            <input
              type="text"
              name="key"
              id="key"
              defaultValue={defaultValues?.key || ''}
              className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold"
              placeholder="e.g., PROJ-123"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
            Tactical Briefing
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={defaultValues?.description || ''}
            className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all resize-none font-bold"
            placeholder="Add details about this project..."
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
            Operational Tags
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            defaultValue={defaultValues?.tags ? (Array.isArray(defaultValues.tags) ? defaultValues.tags.join(', ') : defaultValues.tags) : ''}
            className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold"
            placeholder="Comma-separated tags"
          />
        </div>
      </div>

      {/* Status & Priority */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Executive Oversight
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="status" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Operational Status
            </label>
            <div className="relative">
                <select
                name="status"
                id="status"
                defaultValue={defaultValues?.status || 'planning'}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-indigo-500/30 transition-all appearance-none cursor-pointer font-bold"
                >
                <option value="planning" className="bg-background">Planning</option>
                <option value="in_progress" className="bg-background">In Progress</option>
                <option value="completed" className="bg-background">Completed</option>
                <option value="on_hold" className="bg-background">On Hold</option>
                </select>
            </div>
          </div>

          <div>
            <label htmlFor="priority" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Strategic Priority
            </label>
            <div className="relative">
                <select
                name="priority"
                id="priority"
                defaultValue={defaultValues?.priority || 'medium'}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-indigo-500/30 transition-all appearance-none cursor-pointer font-bold"
                >
                <option value="low" className="bg-background">Low</option>
                <option value="medium" className="bg-background">Medium</option>
                <option value="high" className="bg-background">High</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Temporal Projection
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Commencement Date
            </label>
            <CustomDatePicker
              value={startDate}
              onChange={setStartDate}
              name="startDate"
              className="w-full"
              placeholder="Select start date"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Terminal Date
            </label>
            <CustomDatePicker
              value={endDate}
              onChange={setEndDate}
              name="endDate"
              className="w-full"
              placeholder="Select end date"
              minDate={startDate || undefined}
            />
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Resource Intelligence
        </h3>
        
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label htmlFor="budget" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Mission Budget
            </label>
            <CustomNumberInput
                value={budget}
                onChange={setBudget}
                name="budget"
                className="w-full"
                placeholder="0"
                min={0}
            />
          </div>

          <div>
            <label htmlFor="spent" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Allocated Capital
            </label>
            <CustomNumberInput
                value={spent}
                onChange={setSpent}
                name="spent"
                className="w-full"
                placeholder="0"
                min={0}
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Unit Currency
            </label>
            <input
              type="text"
              name="currency"
              id="currency"
              defaultValue={defaultValues?.currency || 'USD'}
              className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-indigo-500/30 transition-all font-bold"
              placeholder="USD"
            />
          </div>
        </div>

        <div>
          <label htmlFor="billingType" className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
            Billing Protocol
          </label>
          <div className="relative">
            <select
                name="billingType"
                id="billingType"
                defaultValue={defaultValues?.billingType || 'non_billable'}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-indigo-500/30 transition-all appearance-none cursor-pointer font-bold"
            >
                <option value="non_billable" className="bg-background">Non-Billable</option>
                <option value="time_and_materials" className="bg-background">Time & Materials</option>
                <option value="fixed_price" className="bg-background">Fixed Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team & Stakeholders */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Personnel Assignment
        </h3>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Owner */}
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Command Lead
            </label>
            <Combobox
              name="ownerId"
              options={users.map(u => ({ value: u.id, label: u.fullName || u.email, subLabel: u.email }))}
              value={selectedOwner || ''}
              onChange={(val) => setSelectedOwner(val as string | number | null)}
              placeholder="Select owner..."
              searchPlaceholder="Search users..."
              className="w-full"
            />
          </div>

          {/* Client */}
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">
              Strategic Partner
            </label>
            <Combobox
              name="clientId"
              options={clients.map(c => ({ value: c.id, label: c.companyName, subLabel: c.contactEmail || undefined }))}
              value={selectedClient || ''}
              onChange={(val) => setSelectedClient(val as string | number | null)}
              placeholder="Select client..."
              searchPlaceholder="Search clients..."
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

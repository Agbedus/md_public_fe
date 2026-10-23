"use client";

import { FormStep, FormStepHeader } from "@/components/ui/form-wizard";
import { CustomSelect } from "@/components/ui/inputs/custom-select";
import React, { useState } from "react";
import { Project } from "@/types/project";
import { User } from "@/types/user";
import { Client } from "@/types/client";
import { Combobox } from "@/components/ui/combobox";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { CustomNumberInput } from "@/components/ui/inputs/custom-number-input";

interface ProjectFormFieldsProps {
  defaultValues?: Partial<Project>;
  users: User[];
  clients: Client[];
}

export function ProjectFormFields({
  defaultValues,
  users,
  clients,
}: ProjectFormFieldsProps) {
  const [selectedOwner, setSelectedOwner] = useState<string | number | null>(
    defaultValues?.ownerId || null,
  );
  const [selectedClient, setSelectedClient] = useState<string | number | null>(
    defaultValues?.clientId || null,
  );

  const [startDate, setStartDate] = useState<Date | null>(
    defaultValues?.startDate ? new Date(defaultValues.startDate) : null,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    defaultValues?.endDate ? new Date(defaultValues.endDate) : null,
  );
  const [budget, setBudget] = useState<number | "">(
    defaultValues?.budget || "",
  );
  const [spent, setSpent] = useState<number | "">(defaultValues?.spent || "");

  return (
    <div className="space-y-6">
      <FormStepHeader />
      <FormStep index={0}>
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Project details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label
                htmlFor="name"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Project name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={defaultValues?.name}
                className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all font-bold"
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label
                htmlFor="key"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Project Key
              </label>
              <input
                type="text"
                name="key"
                id="key"
                defaultValue={defaultValues?.key || ""}
                className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all font-bold"
                placeholder="e.g., PROJ-123"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
            >
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              defaultValue={defaultValues?.description || ""}
              className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all resize-none font-bold"
              placeholder="Add details about this project..."
            />
          </div>

          <div>
            <label
              htmlFor="tags"
              className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
            >
              Tags
            </label>
            <input
              type="text"
              name="tags"
              id="tags"
              defaultValue={
                defaultValues?.tags
                  ? Array.isArray(defaultValues.tags)
                    ? defaultValues.tags.join(", ")
                    : defaultValues.tags
                  : ""
              }
              className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all font-bold"
              placeholder="Comma-separated tags"
            />
          </div>
        </div>

        {/* Status & Priority */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Status & priority
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            <div>
              <label
                htmlFor="status"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Status
              </label>
              <div className="relative">
                <CustomSelect
                  label="Status"
                  name="status"
                  id="status"
                  defaultValue={String(defaultValues?.status || "planning")}
                  options={[
                    { value: "planning", label: "Planning" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "on_hold", label: "On Hold" },
                  ]}
                  className="w-full"
                  triggerClassName="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Priority
              </label>
              <div className="relative">
                <CustomSelect
                  label="Priority"
                  name="priority"
                  id="priority"
                  defaultValue={String(defaultValues?.priority || "medium")}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                  className="w-full"
                  triggerClassName="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </FormStep>
      <FormStep index={1}>
        {/* Timeline */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Timeline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="startDate"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Start date
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
              <label
                htmlFor="endDate"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                End date
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
          <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
            Budget & billing
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            <div>
              <label
                htmlFor="budget"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Budget
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
              <label
                htmlFor="spent"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
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
              <label
                htmlFor="currency"
                className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
              >
                Unit Currency
              </label>
              <input
                type="text"
                name="currency"
                id="currency"
                defaultValue={defaultValues?.currency || "USD"}
                className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all font-bold"
                placeholder="USD"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="billingType"
              className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1"
            >
              Billing type
            </label>
            <div className="relative">
              <CustomSelect
                label="Billing type"
                name="billingType"
                id="billingType"
                defaultValue={String(
                  defaultValues?.billingType || "non_billable",
                )}
                options={[
                  { value: "non_billable", label: "Non-Billable" },
                  { value: "time_and_materials", label: "Time & Materials" },
                  { value: "fixed_price", label: "Fixed Price" },
                ]}
                className="w-full"
                triggerClassName="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-xl px-4 py-3 text-foreground focus:outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>
      </FormStep>
      <FormStep index={2}>
        {/* Team & Stakeholders */}
        <div className="space-y-6">
          <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
            People
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            {/* Owner */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1">
                Owner
              </label>
              <Combobox
                name="ownerId"
                options={users.map((u) => ({
                  value: u.id,
                  label: u.fullName || u.email,
                  subLabel: u.email,
                }))}
                value={selectedOwner || ""}
                onChange={(val) =>
                  setSelectedOwner(val as string | number | null)
                }
                placeholder="Select owner..."
                searchPlaceholder="Search users..."
                className="w-full"
              />
            </div>

            {/* Client */}
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-text-muted mb-1.5 ml-1">
                Client
              </label>
              <Combobox
                name="clientId"
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.companyName,
                  subLabel: c.contactEmail || undefined,
                }))}
                value={selectedClient || ""}
                onChange={(val) =>
                  setSelectedClient(val as string | number | null)
                }
                placeholder="Select client..."
                searchPlaceholder="Search clients..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      </FormStep>
    </div>
  );
}

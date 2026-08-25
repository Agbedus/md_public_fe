"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { FiBriefcase, FiBell, FiCheck, FiGlobe, FiCopy, FiCamera } from "react-icons/fi";
import { toast } from "@/lib/toast";
import { Toggle } from "@/components/ui/inputs/toggle";
import { updateOrganizationSettings } from "@/lib/org-actions";
import { uploadOrganizationLogo } from "@/app/(dashboard)/[orgSlug]/settings/actions";
import type { OrganizationSettings } from "@/types/organization";

interface OrganizationSettingsFormProps {
  organization: OrganizationSettings;
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-emerald-500/40 transition-all";
const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5";

/** Neutral icon chip — dark/gray with a plain foreground-colored icon, matching
 *  the treatment applied to the "My settings" tab; no per-section color coding. */
const iconChipClass = "bg-foreground/[0.06] border-card-border text-foreground";

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-5 rounded-2xl border border-card-border space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-card-border">
        <div className={`p-2 rounded-xl border shrink-0 ${iconChipClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

type ProfileFields = Pick<
  OrganizationSettings,
  "name" | "description" | "industry" | "company_size" | "website" | "address" | "country" | "timezone" | "is_public"
>;

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const reduceMotion = useReducedMotion();

  const [fields, setFields] = useState<ProfileFields>({
    name: organization.name,
    description: organization.description,
    industry: organization.industry,
    company_size: organization.company_size,
    website: organization.website,
    address: organization.address,
    country: organization.country,
    timezone: organization.timezone,
    is_public: organization.is_public,
  });
  const [savedFields, setSavedFields] = useState<ProfileFields>(fields);
  const [isSaving, setIsSaving] = useState(false);

  const [smsEnabled, setSmsEnabled] = useState(organization.sms_notifications_enabled);
  const [isSmsSaving, setIsSmsSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState(organization.logo_url);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isDirty = JSON.stringify(fields) !== JSON.stringify(savedFields);

  const updateField = <K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateOrganizationSettings(organization.id, fields);
      if (!result.success) {
        toast.error(result.error || "Couldn't save organization settings.");
        return;
      }
      setSavedFields(fields);
      toast.success("Organization settings saved");
    } catch {
      toast.error("Couldn't save organization settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSmsToggle = async (next: boolean) => {
    const previous = smsEnabled;
    setSmsEnabled(next);
    setIsSmsSaving(true);
    try {
      const result = await updateOrganizationSettings(organization.id, { sms_notifications_enabled: next });
      if (!result.success) {
        setSmsEnabled(previous);
        toast.error(result.error || "Couldn't update SMS notifications.");
        return;
      }
      toast.success(next ? "Organization SMS notifications on" : "Organization SMS notifications off");
    } catch {
      setSmsEnabled(previous);
      toast.error("Couldn't update SMS notifications.");
    } finally {
      setIsSmsSaving(false);
    }
  };

  const handleLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setIsLogoSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadOrganizationLogo(organization.id, fd);
      if (!result.success) {
        toast.error(result.error || "Couldn't upload logo");
        return;
      }
      if (result.logo_url) setLogoUrl(result.logo_url);
      toast.success("Logo updated");
    } catch {
      toast.error("Couldn't upload logo");
    } finally {
      setIsLogoSaving(false);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(organization.invite_code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy invite code");
    }
  };

  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Organization profile */}
      <motion.div {...fadeUp}>
        <SectionCard
          icon={<FiBriefcase size={16} />}
          title="Organization profile"
          subtitle="Shared across everyone in this workspace"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isLogoSaving}
                className="relative w-16 h-16 rounded-2xl overflow-hidden border border-card-border bg-foreground/[0.04] shrink-0 group disabled:cursor-wait"
                title="Change logo"
              >
                {logoUrl ? (
                  <Image src={logoUrl} alt={fields.name} fill className="object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-foreground/40 text-xl font-bold uppercase">
                    {fields.name.charAt(0) || "?"}
                  </span>
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  {isLogoSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <FiCamera size={16} />
                  )}
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Logo</p>
                <p className="text-xs text-text-muted">PNG, JPG, GIF or WebP, up to 5 MB</p>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoPick} className="hidden" />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={fields.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={2}
                value={fields.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="What this workspace is for"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Industry</label>
                <input
                  type="text"
                  value={fields.industry ?? ""}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Software"
                />
              </div>
              <div>
                <label className={labelClass}>Company size</label>
                <select
                  value={fields.company_size ?? ""}
                  onChange={(e) => updateField("company_size", e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Website</label>
                <input
                  type="text"
                  value={fields.website ?? ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  className={inputClass}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  value={fields.country ?? ""}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={fields.address ?? ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <input
                  type="text"
                  value={fields.timezone ?? ""}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. America/New_York"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-card-border space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <label className="text-sm font-medium text-foreground">Discoverable</label>
                  <p className="text-xs text-text-muted">List this organization publicly so people can find and request to join</p>
                </div>
                <Toggle
                  label="Discoverable"
                  isChecked={fields.is_public}
                  onChange={(next) => updateField("is_public", next)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs text-text-muted bg-foreground/[0.03] border border-card-border rounded-xl px-3 py-2.5">
                <span className="flex items-center gap-2 min-w-0">
                  <FiGlobe className="shrink-0" size={13} />
                  Invite code: <span className="text-foreground font-medium font-numbers">{organization.invite_code}</span>
                </span>
                <button
                  type="button"
                  onClick={copyInviteCode}
                  className="shrink-0 flex items-center gap-1.5 text-foreground hover:text-emerald-500 transition-colors"
                >
                  <FiCopy size={13} />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Notifications */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduceMotion ? 0 : 0.05 }}>
        <SectionCard
          icon={<FiBell size={16} />}
          title="Notifications"
          subtitle="Workspace-wide switches"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <label className="text-sm font-medium text-foreground">SMS notifications</label>
              <p className="text-xs text-text-muted">
                Master switch for this organization. When off, no one here receives SMS regardless of their personal setting.
              </p>
            </div>
            <Toggle
              label="Organization SMS notifications"
              isChecked={smsEnabled}
              onChange={handleSmsToggle}
              isDisabled={isSmsSaving}
            />
          </div>
        </SectionCard>
      </motion.div>

      {/* SAVE BAR */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          type="submit"
          disabled={isSaving || !isDirty}
          aria-busy={isSaving}
          className="flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-[transform,opacity,background-color] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
              Saving...
            </>
          ) : (
            <>
              <FiCheck size={13} />
              Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

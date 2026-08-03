'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FiMail, FiShield, FiCalendar, FiCheckSquare, FiBriefcase, FiCheckCircle, FiEdit2, FiCamera, FiCheck, FiX, FiLoader, FiLock } from 'react-icons/fi';
import { updateMyProfile, uploadMyAvatar } from '@/app/(dashboard)/[orgSlug]/profile/actions';
import { orgRoleToneClasses } from '@/types/organization';
import { toast } from '@/lib/toast';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-emerald-500/40 transition-all';
const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5 text-left';

interface ProfileInfoCardProps {
  email: string;
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  platformRoles?: string[];
  orgRole: { label: string; tone: string } | null;
  currentOrg: { name: string; joined_at?: string | null } | null;
}

export function ProfileInfoCard({
  email,
  fullName,
  jobTitle,
  phone,
  avatarUrl,
  platformRoles,
  orgRole,
  currentOrg,
}: ProfileInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Committed values — what's actually saved, shown in read mode and used to
  // detect whether the form has unsaved changes.
  const [savedName, setSavedName] = useState(fullName ?? '');
  const [savedTitle, setSavedTitle] = useState(jobTitle ?? '');
  const [savedPhone, setSavedPhone] = useState(phone ?? '');
  const [savedAvatar, setSavedAvatar] = useState(avatarUrl);

  // Draft values, live while the form is open.
  const [nameDraft, setNameDraft] = useState(savedName);
  const [titleDraft, setTitleDraft] = useState(savedTitle);
  const [phoneDraft, setPhoneDraft] = useState(savedPhone);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName = savedName || 'User';
  const initial = (displayName || email || '?').charAt(0).toUpperCase();
  const shownAvatar = isEditing ? (preview ?? savedAvatar) : savedAvatar;

  const isDirty =
    nameDraft !== savedName || titleDraft !== savedTitle || phoneDraft !== savedPhone || pendingFile !== null;

  const openEdit = () => {
    setNameDraft(savedName);
    setTitleDraft(savedTitle);
    setPhoneDraft(savedPhone);
    setPreview(null);
    setPendingFile(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setIsEditing(false);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);

    if (pendingFile) {
      const fd = new FormData();
      fd.append('file', pendingFile);
      const res = await uploadMyAvatar(fd);
      if (!res.success) {
        setIsSaving(false);
        toast.error(res.error || 'Failed to upload avatar');
        return;
      }
      if (res.avatar_url) setSavedAvatar(res.avatar_url);
    }

    const nameChanged = nameDraft !== savedName;
    const titleChanged = titleDraft !== savedTitle;
    const phoneChanged = phoneDraft !== savedPhone;

    if (nameChanged || titleChanged || phoneChanged) {
      const res = await updateMyProfile({
        ...(nameChanged ? { full_name: nameDraft } : {}),
        ...(titleChanged ? { job_title: titleDraft } : {}),
        ...(phoneChanged ? { phone: phoneDraft } : {}),
      });
      if (!res.success) {
        setIsSaving(false);
        toast.error(res.error || 'Failed to update profile');
        return;
      }
    }

    if (nameChanged) setSavedName(nameDraft);
    if (titleChanged) setSavedTitle(titleDraft);
    if (phoneChanged) setSavedPhone(phoneDraft);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setIsSaving(false);
    setIsEditing(false);
    toast.success('Profile updated');
  };

  return (
    <div className="glass p-5 lg:p-8 rounded-3xl border border-foreground/5 bg-foreground/[0.03] backdrop-blur-xl flex flex-col items-center text-center">
      {/* Avatar Section */}
      <div className="relative mb-4 lg:mb-6">
        {isEditing ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-foreground/5 group"
            title="Change photo"
          >
            {shownAvatar ? (
              <Image src={shownAvatar} alt={displayName} fill className="object-cover" />
            ) : (
              <span className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-4xl lg:text-5xl font-bold">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <FiCamera className="w-6 h-6" />
            </span>
          </button>
        ) : shownAvatar ? (
          <div className="relative w-32 h-32 lg:w-40 lg:h-40">
            <Image src={shownAvatar} alt={displayName} fill className="rounded-full object-cover border-4 border-foreground/5" />
          </div>
        ) : (
          <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-4xl lg:text-5xl font-bold border-4 border-foreground/5">
            {initial}
          </div>
        )}
        {!isEditing && <div className="absolute bottom-2 right-2 p-2 rounded-full bg-emerald-500 border-4 border-background" />}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
      </div>

      {isEditing ? (
        <div className="w-full space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className={inputClass} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelClass}>Job title</label>
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className={inputClass} placeholder="Operations Lead" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} className={inputClass} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.02] border border-card-border text-sm text-text-muted">
              <FiLock size={12} className="shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1.5 ml-1 text-left">Email and password aren&apos;t changed here — see Settings.</p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">{displayName}</h2>
          {savedTitle && <p className="text-text-secondary text-sm font-medium mb-1">{savedTitle}</p>}
          <p className="text-text-muted text-sm font-medium mb-1 flex items-center gap-2">
            <FiMail className="w-4 h-4" /> {email}
          </p>
          {savedPhone && <p className="text-text-muted text-sm font-medium mb-4 lg:mb-6">{savedPhone}</p>}
          {!savedPhone && <div className="mb-4 lg:mb-6" />}

          {/* Org Context — replaces generic "Roles" */}
          <div className="w-full space-y-3 lg:space-y-4 pt-4 lg:pt-6 border-t border-foreground/5">
            {currentOrg && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted flex items-center gap-2"><FiBriefcase className="w-4 h-4" /> Organization</span>
                <span className="text-foreground font-bold text-xs text-right truncate max-w-[140px]">{currentOrg.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted flex items-center gap-2"><FiShield className="w-4 h-4" /> Org Role</span>
              {orgRole ? (
                <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${orgRoleToneClasses[orgRole.tone] || 'bg-foreground/[0.06] text-text-muted border-foreground/5 border'}`}>
                  {orgRole.label}
                </span>
              ) : (
                <span className="text-text-muted text-xs">—</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted flex items-center gap-2"><FiCheckCircle className="w-4 h-4" /> Platform Role</span>
              <div className="flex gap-1 flex-wrap justify-end">
                {platformRoles?.map(role => (
                  <span key={role} className="text-text-muted font-bold uppercase tracking-wider text-[10px] bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                    {role.replace('_', ' ')}
                  </span>
                )) || <span className="text-text-muted">None</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted flex items-center gap-2"><FiCalendar className="w-4 h-4" /> Member Since</span>
              <span className="text-foreground font-medium text-xs">
                {currentOrg?.joined_at ? new Date(currentOrg.joined_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted flex items-center gap-2"><FiCheckSquare className="w-4 h-4" /> Workspace</span>
              <span className="text-foreground font-medium text-xs">{currentOrg?.name || 'Personal'}</span>
            </div>
          </div>
        </>
      )}

      {isEditing ? (
        <div className="w-full flex items-center gap-2 mt-6 lg:mt-8">
          <button
            onClick={cancelEdit}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 lg:py-3 rounded-2xl border border-foreground/5 text-text-muted hover:text-foreground hover:bg-foreground/[0.03] transition-all text-sm lg:text-base disabled:opacity-50"
          >
            <FiX className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 lg:py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-all text-sm lg:text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      ) : (
        <button
          onClick={openEdit}
          className="w-full flex items-center justify-center gap-2 mt-6 lg:mt-8 py-2.5 lg:py-3 rounded-2xl bg-foreground/[0.03] border border-foreground/5 text-foreground font-semibold hover:bg-foreground/[0.06] transition-all hover:scale-[1.02] active:scale-95 text-sm lg:text-base"
        >
          <FiEdit2 className="w-4 h-4" /> Edit Profile Details
        </button>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FiX, FiCamera, FiCheck, FiLock, FiLoader } from 'react-icons/fi';
import type { OrganizationMembershipWithUser } from '@/types/organization';
import { updateMemberProfile, uploadMemberAvatar } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { toast } from '@/lib/toast';
import { Portal } from '@/components/ui/portal';

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-emerald-500/40 transition-all';
const labelClass = 'block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5';

interface MemberEditModalProps {
  member: OrganizationMembershipWithUser;
  /** True when the viewer is editing their own row — unlocks nothing extra here,
   *  but drives the copy explaining why phone/email are read-only. */
  isSelf: boolean;
  onClose: () => void;
  onSaved: (patch: { full_name?: string; job_title?: string; avatar_url?: string }) => void;
}

export function MemberEditModal({ member, isSelf, onClose, onSaved }: MemberEditModalProps) {
  const [fullName, setFullName] = useState(member.user.full_name ?? '');
  const [jobTitle, setJobTitle] = useState(member.user.job_title ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initial = (member.user.full_name || member.user.email || '?')[0].toUpperCase();
  const shownAvatar = preview ?? member.user.avatar_url ?? null;

  const isDirty =
    fullName !== (member.user.full_name ?? '') ||
    jobTitle !== (member.user.job_title ?? '') ||
    pendingFile !== null;

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
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);

    let uploadedUrl: string | undefined;

    if (pendingFile) {
      const fd = new FormData();
      fd.append('file', pendingFile);
      const res = await uploadMemberAvatar(member.user_id, fd);
      if (!res.success) {
        setIsSaving(false);
        toast.error(res.error || 'Failed to upload avatar');
        return;
      }
      uploadedUrl = res.avatar_url;
    }

    const nameChanged = fullName !== (member.user.full_name ?? '');
    const titleChanged = jobTitle !== (member.user.job_title ?? '');

    if (nameChanged || titleChanged) {
      const res = await updateMemberProfile(member.user_id, {
        ...(nameChanged ? { full_name: fullName } : {}),
        ...(titleChanged ? { job_title: jobTitle } : {}),
      });
      if (!res.success) {
        setIsSaving(false);
        toast.error(res.error || 'Failed to update profile');
        return;
      }
    }

    setIsSaving(false);
    onSaved({
      ...(nameChanged ? { full_name: fullName } : {}),
      ...(titleChanged ? { job_title: jobTitle } : {}),
      ...(uploadedUrl ? { avatar_url: uploadedUrl } : {}),
    });
    toast.success('Profile updated');
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-md bg-background border border-card-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Edit member</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                {member.user.email}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-all"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden border border-card-border group shrink-0"
                title="Change photo"
              >
                {shownAvatar ? (
                  <Image src={shownAvatar} alt={fullName || 'Member'} fill className="object-cover" />
                ) : (
                  <span className="w-full h-full bg-foreground/[0.06] flex items-center justify-center text-xl font-bold text-foreground/60">
                    {initial}
                  </span>
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <FiCamera size={16} />
                </span>
              </button>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Change photo
                </button>
                <p className="text-[11px] text-text-muted mt-1">JPG, PNG, GIF or WebP. Max 5 MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
            </div>

            <div>
              <label className={labelClass}>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Jane Doe" />
            </div>

            <div>
              <label className={labelClass}>Job title</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClass} placeholder="Operations Lead" />
            </div>

            {/* Read-only, self-service-only fields */}
            <div className="space-y-3 pt-1">
              <div>
                <label className={labelClass}>Email</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.02] border border-card-border text-sm text-text-muted">
                  <FiLock size={12} className="shrink-0" />
                  <span className="truncate">{member.user.email}</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.02] border border-card-border text-sm text-text-muted">
                  <FiLock size={12} className="shrink-0" />
                  <span className="truncate">{member.user.phone || 'Not set'}</span>
                </div>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {isSelf
                  ? 'Email, phone, and password are changed from your own profile settings.'
                  : 'Email, phone, and password can only be changed by this person.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-card-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-foreground border border-card-border hover:bg-foreground/[0.03] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? <FiLoader size={13} className="animate-spin" /> : <FiCheck size={13} />}
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

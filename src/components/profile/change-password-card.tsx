'use client';

import { useState } from 'react';
import { FiLock, FiEye, FiEyeOff, FiLoader, FiCheck } from 'react-icons/fi';
import { changeMyPassword } from '@/app/(dashboard)/[orgSlug]/profile/actions';
import { toast } from '@/lib/toast';

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const inputClass = 'block w-full pl-10 pr-10 py-2.5 bg-background/50 border border-card-border rounded-xl text-sm text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.03] transition-all [font-size:max(16px,inherit)]';

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsPending(true);
    try {
      const result = await changeMyPassword({ current_password: currentPassword, new_password: newPassword });
      if (!result.success) {
        toast.error(result.error || 'Failed to change password.');
        return;
      }
      toast.success('Password changed.');
      reset();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="glass p-6 rounded-3xl border border-foreground/5 bg-foreground/[0.03] space-y-4">
      <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <FiLock className="text-emerald-400" /> Change Password
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <FiLock className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <input
            className={inputClass}
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <FiLock className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <input
            className={inputClass}
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <FiLock className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <input
            className={inputClass}
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPasswords ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="relative w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
            <FiCheck className="h-4 w-4" />
            Update password
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

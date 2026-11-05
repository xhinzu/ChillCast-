'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { profileUpdateSchema } from '@/lib/auth/validation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, updateDisplayName, signOut, isLoading } = useUser();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Handle Display Name save
  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = profileUpdateSchema.safeParse({ display_name: displayName });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Invalid display name');
      return;
    }

    const result = await updateDisplayName(displayName);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccessMsg('Display name updated successfully!');
      setIsEditing(false);
    }
  };

  // Handle Download My Data (JSON)
  const handleDownloadData = async () => {
    try {
      setIsDownloading(true);
      setErrorMsg(null);
      const res = await fetch('/api/user/export');
      if (!res.ok) {
        throw new Error('Failed to generate export file');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chillcast-user-data-${user.id.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setErrorMsg('Could not download user data. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Delete My Account
  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setErrorMsg(null);

      const res = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }

      await signOut();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setErrorMsg(msg);
      setIsDeleting(false);
    }
  };

  // Compute initials avatar fallback
  const initials = (profile?.display_name || user.email || 'U')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121214] border border-[#26262a] rounded-2xl shadow-2xl p-6 sm:p-7 relative text-white space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1e1e24] hover:bg-[#2c2c34] text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 border-b border-[#24242a] pb-5">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0 border-2 border-white/10">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || 'User Avatar'}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* User info */}
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl font-bold truncate">
              {profile?.display_name || 'Chill Listener'}
            </h2>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            {profile?.discord_id && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] text-[10px] font-semibold mt-1">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z" />
                </svg>
                Connected via Discord
              </span>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {/* Section: Profile Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Profile Information
            </h3>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
              >
                Edit Display Name
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveDisplayName} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Display Name (2–24 characters)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                  required
                  className="w-full h-10 rounded-xl bg-[#1a1a20] border border-[#2e2e38] text-white text-xs px-3.5 outline-none focus:border-zinc-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(profile?.display_name || '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1e1e24] hover:bg-[#2a2a32] text-zinc-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262e] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Display Name:</span>
                <span className="font-medium text-white">{profile?.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Account ID:</span>
                <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                  {user.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Member Since:</span>
                <span className="text-zinc-400">
                  {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section: Cloud Sync Status (Step 2/3 Placeholder) */}
        {/* TODO: Step 2/3 - Cloud sync for playlists & liked songs */}
        <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262e] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Library Cloud Sync</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Local Only
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Your playlists, liked songs, and custom ambiance settings are currently stored securely on your local device. Cloud library backup and cross-device syncing will be enabled in an upcoming release.
          </p>
        </div>

        {/* Section: Data Privacy & Export */}
        <div className="pt-2 border-t border-[#24242a] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Data & Privacy
          </h3>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-zinc-200">Download My Data</p>
              <p className="text-[11px] text-zinc-500">
                Export all your profile and account metadata in JSON format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadData}
              disabled={isDownloading}
              className="px-3.5 py-1.5 rounded-xl bg-[#1e1e24] hover:bg-[#2c2c34] border border-[#2f2f3a] text-zinc-200 hover:text-white text-xs font-medium cursor-pointer shrink-0 transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Exporting...' : 'Download JSON'}
            </button>
          </div>
        </div>

        {/* Section: Account Deletion */}
        <div className="pt-2 border-t border-[#24242a] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400/80">
            Danger Zone
          </h3>

          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-rose-300">Delete My Account</p>
                <p className="text-[11px] text-zinc-500">
                  Permanently deletes your profile and account data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-medium cursor-pointer shrink-0 transition-colors"
              >
                Delete Account
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <p className="text-xs text-rose-200 font-semibold">
                Are you sure you want to delete your account?
              </p>
              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                This action is permanent and cannot be undone. All your profile information and account access will be erased immediately.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting && (
                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Permanently Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-[#1e1e24] hover:bg-[#2a2a32] text-zinc-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

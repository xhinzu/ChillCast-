'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { isTauri, getDiscordStatus, listenDiscordStatus } from '@/lib/desktop';

export interface UserAvatarInfo {
  avatarUrl: string | null;
  displayName: string;
  initials: string;
  handleImageError: () => void;
  isDiscordConnected: boolean;
}

export function useUserAvatar(): UserAvatarInfo {
  const { user, profile } = useUser();
  const [desktopAvatar, setDesktopAvatar] = useState<string | null>(null);
  const [isDiscordIpcConnected, setIsDiscordIpcConnected] = useState<boolean>(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  // Listen to desktop Discord IPC if available
  useEffect(() => {
    if (!isTauri()) return;

    let unlistenFn: (() => void) | null = null;

    getDiscordStatus().then((res) => {
      if (res.status === 'Connected') {
        setIsDiscordIpcConnected(true);
        if (res.data.avatarUrl) {
          setDesktopAvatar(res.data.avatarUrl);
        }
      }
    }).catch(() => {});

    listenDiscordStatus((res) => {
      if (res.status === 'Connected') {
        setIsDiscordIpcConnected(true);
        if (res.data.avatarUrl) {
          setDesktopAvatar(res.data.avatarUrl);
        }
      } else {
        setIsDiscordIpcConnected(false);
      }
    }).then((unsub) => {
      unlistenFn = unsub;
    }).catch(() => {});

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const metaAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);

  // Candidates in priority order
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (desktopAvatar && !failedUrls.has(desktopAvatar)) {
      list.push(desktopAvatar);
    }
    if (profile?.avatar_url && !failedUrls.has(profile.avatar_url)) {
      list.push(profile.avatar_url);
    }
    if (metaAvatar && !failedUrls.has(metaAvatar)) {
      list.push(metaAvatar);
    }
    return list;
  }, [desktopAvatar, profile?.avatar_url, metaAvatar, failedUrls]);

  const avatarUrl = candidates.length > 0 ? candidates[0] : null;

  const displayName =
    profile?.display_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Listener';

  const initials = displayName.trim().slice(0, 2).toUpperCase() || 'CC';

  const handleImageError = useCallback(() => {
    if (avatarUrl) {
      setFailedUrls((prev) => {
        const next = new Set(prev);
        next.add(avatarUrl);
        return next;
      });
    }
  }, [avatarUrl]);

  return {
    avatarUrl,
    displayName,
    initials,
    handleImageError,
    isDiscordConnected: isDiscordIpcConnected || Boolean(profile?.discord_id),
  };
}


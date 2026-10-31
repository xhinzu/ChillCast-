'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '@/constants/zIndex';

export interface ToastProps {
  message: string | null;
  onDismiss?: () => void;
  duration?: number;
}

const emptySubscribe = () => () => {};

export default function Toast({
  message,
  onDismiss,
  duration = 2400,
}: ToastProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message || !isMounted || typeof document === 'undefined') {
    return null;
  }

  const portalTarget =
    (document.fullscreenElement as HTMLElement) || document.body;

  if (!portalTarget) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-white font-medium text-xs shadow-2xl flex items-center gap-2 border border-[#333333] animate-in fade-in slide-in-from-bottom-2 duration-150 select-none pointer-events-none"
      style={{
        zIndex: Z_INDEX.toasts,
        boxShadow:
          '0 20px 40px -10px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">
        ✓
      </span>
      <span className="truncate max-w-xs">{message}</span>
    </div>,
    portalTarget
  );
}

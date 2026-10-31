'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useId,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '@/constants/zIndex';

const emptySubscribe = () => () => {};

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface PopoverProps {
  /** Reference to the trigger button that anchors this popover */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Whether the popover is currently open */
  isOpen: boolean;
  /** Callback fired when the popover should close */
  onClose: () => void;
  /** Preferred placement relative to the trigger. Default is 'top' (above button) */
  placement?: 'top' | 'bottom';
  /** Horizontal alignment relative to trigger. Default is 'start' (aligned to trigger left) */
  align?: 'start' | 'center' | 'end';
  /** Gap in pixels between trigger and popover. Default is 8 */
  offset?: number;
  /** Viewport margin in pixels. Default is 8 */
  viewportMargin?: number;
  /** Additional custom classNames for the popover panel */
  className?: string;
  /** Children elements inside the popover */
  children: React.ReactNode;
  /** ARIA label for the popover menu */
  ariaLabel?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
  actualPlacement: 'top' | 'bottom';
}

const GLOBAL_POPOVER_OPEN_EVENT = 'chillcast_popover_open';

export default function Popover({
  triggerRef,
  isOpen,
  onClose,
  placement = 'top',
  align = 'start',
  offset = 8,
  viewportMargin = 8,
  className = '',
  children,
  ariaLabel,
}: PopoverProps) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  // Broadcast open event to close any other active popover ("opening a second popup closes the first")
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(
        new CustomEvent(GLOBAL_POPOVER_OPEN_EVENT, { detail: { id: popoverId } })
      );
    }
  }, [isOpen, popoverId]);

  // Listen for open events from other popovers to close self
  useEffect(() => {
    if (!isOpen) return;

    const handleOtherOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id !== popoverId) {
        onClose();
      }
    };

    window.addEventListener(GLOBAL_POPOVER_OPEN_EVENT, handleOtherOpen);
    return () => {
      window.removeEventListener(GLOBAL_POPOVER_OPEN_EVENT, handleOtherOpen);
    };
  }, [isOpen, popoverId, onClose]);

  // Calculate coordinates with anchor, viewport clamping (8px margin) and flip detection
  const updateCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Determine target element dimensions
    const popoverWidth = popoverRef.current?.offsetWidth || 224;

    // Calculate available vertical space
    const spaceAbove = triggerRect.top - viewportMargin - offset;
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin - offset;

    // Flip logic: default above trigger. If not enough space above, flip below.
    let targetPlacement: 'top' | 'bottom' = placement;
    if (placement === 'top') {
      if (spaceAbove < 160 && spaceBelow > spaceAbove) {
        targetPlacement = 'bottom';
      }
    } else {
      if (spaceBelow < 160 && spaceAbove > spaceBelow) {
        targetPlacement = 'top';
      }
    }

    // Horizontal positioning: align to trigger and clamp strictly within viewport (8px margin)
    let desiredLeft = triggerRect.left;
    if (align === 'center') {
      desiredLeft = triggerRect.left + (triggerRect.width - popoverWidth) / 2;
    } else if (align === 'end') {
      desiredLeft = triggerRect.right - popoverWidth;
    }

    const minLeft = viewportMargin;
    const maxLeft = Math.max(minLeft, viewportWidth - popoverWidth - viewportMargin);
    const clampedLeft = Math.max(minLeft, Math.min(desiredLeft, maxLeft));

    // Vertical positioning & Max height
    if (targetPlacement === 'top') {
      const maxHeight = Math.min(
        viewportHeight * 0.6,
        viewportHeight - 24,
        Math.max(120, spaceAbove)
      );
      setCoords({
        bottom: viewportHeight - triggerRect.top + offset,
        left: clampedLeft,
        maxHeight,
        actualPlacement: 'top',
      });
    } else {
      const maxHeight = Math.min(
        viewportHeight * 0.6,
        viewportHeight - 24,
        Math.max(120, spaceBelow)
      );
      setCoords({
        top: triggerRect.bottom + offset,
        left: clampedLeft,
        maxHeight,
        actualPlacement: 'bottom',
      });
    }
  }, [triggerRef, placement, align, offset, viewportMargin]);

  // Update coords on open, resize, scroll, and fullscreen changes
  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => updateCoords();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    document.addEventListener('fullscreenchange', handleWindowChange);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      document.removeEventListener('fullscreenchange', handleWindowChange);
    };
  }, [isOpen, updateCoords]);

  // Focus management: focus moves into menu on open, returns to trigger on close
  useEffect(() => {
    if (!isOpen) return;

    // Focus the first focusable menu item or the menu itself
    const timer = setTimeout(() => {
      if (popoverRef.current) {
        const focusable = popoverRef.current.querySelector<HTMLElement>(
          '[role="menuitem"]:not([disabled]), button:not([disabled]), [tabindex="0"]'
        );
        if (focusable) {
          focusable.focus();
        } else {
          popoverRef.current.focus();
        }
      }
    }, 16);

    const triggerEl = triggerRef.current;
    return () => {
      clearTimeout(timer);
      // Return focus to trigger button on close
      triggerEl?.focus();
    };
  }, [isOpen, triggerRef]);

  // Event handlers: Outside click, Esc key, Window blur, Route change
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // Click is inside popover or inside trigger button
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;

      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Keyboard navigation with Arrow keys through menu items
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        if (!popoverRef.current) return;
        const items = Array.from(
          popoverRef.current.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([disabled]), button:not([disabled])'
          )
        );

        if (items.length === 0) return;
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);

        e.preventDefault();

        if (e.key === 'Home') {
          items[0]?.focus();
          return;
        }
        if (e.key === 'End') {
          items[items.length - 1]?.focus();
          return;
        }

        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
        }
      }
    };

    const handleBlur = () => {
      // Close on window blur
      onClose();
    };

    const handlePopState = () => {
      // Close on route / navigation changes
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !isMounted || typeof document === 'undefined') {
    return null;
  }

  // Target portal container: document.fullscreenElement when in fullscreen, or document.body
  const portalTarget =
    (document.fullscreenElement as HTMLElement) || document.body;

  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={popoverRef}
      id={popoverId}
      role="menu"
      tabIndex={-1}
      aria-orientation="vertical"
      aria-label={ariaLabel || 'Menu'}
      className={`fixed rounded-xl bg-[#161616] border border-[#2a2a2a] shadow-2xl p-2 select-none overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent animate-in fade-in zoom-in-95 duration-100 ease-out outline-none ${className}`}
      style={{
        position: 'fixed',
        top: coords?.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords?.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: coords ? `${coords.left}px` : undefined,
        maxHeight: coords
          ? `${coords.maxHeight}px`
          : 'min(60vh, calc(100vh - 24px))',
        zIndex: Z_INDEX.popovers,
        boxShadow:
          '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        backgroundColor: '#161616', // Solid opaque to never show background bleed
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    portalTarget
  );
}

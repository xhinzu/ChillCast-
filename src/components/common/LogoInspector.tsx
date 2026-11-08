'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useSettings } from '@/lib/settings/useSettings';

interface LogoInspectorProps {
  onHomeClick: () => void;
  onOpenInspectModal?: () => void;
}

export default function LogoInspector({ onHomeClick, onOpenInspectModal }: LogoInspectorProps) {
  const { settings } = useSettings();
  const holdEnabled = settings.appearance.holdLogoToInspect;

  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 7-tap easter egg counter
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // Hold timer refs
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Announcer for screen readers
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  // Handle pointer down (initiate hold timer)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Left click/touch only
    isHoldingRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (!holdEnabled) return;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      triggerInspect();
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!holdTimerRef.current) return;
    const dist = Math.hypot(
      e.clientX - pointerStartPosRef.current.x,
      e.clientY - pointerStartPosRef.current.y
    );
    if (dist > 8) {
      // Cancel hold if dragged
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldingRef.current) {
      // Long press already triggered inspection; do not trigger tap/navigation
      isHoldingRef.current = false;
      return;
    }

    // Short tap: check 7-tap inspect modal or trigger standard Home click
    const now = Date.now();
    if (now - lastTapTimeRef.current < 450) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      if (onOpenInspectModal) {
        onOpenInspectModal();
        return;
      }
    }

    onHomeClick();
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
  };

  const triggerInspect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSourceRect(rect);
    }
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsOpen(true);
    setIsAnimating(true);
    setAriaAnnouncement('Logo enlarged. Press Escape to close.');

    // Allow browser to apply initial FLIP coordinates, then animate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(false);
      });
    });
  };

  const closeInspect = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
      setAriaAnnouncement('');
    }, 280);
  }, []);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeInspect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeInspect]);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomScale((prev) => Math.max(1.0, Math.min(4.0, prev + delta)));
  };

  // Drag pan handler when zoomed in
  const handlePanDown = (e: React.PointerEvent) => {
    if (zoomScale <= 1.05) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePanMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePanUp = () => {
    isDraggingRef.current = false;
  };

  // Double click resets zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate FLIP target dimensions: ~40% viewport, max 480px
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const targetWidth = Math.min(viewportWidth * 0.4, 480);
  const targetHeight = targetWidth * 0.4;
  const targetX = (viewportWidth - targetWidth) / 2;
  const targetY = (viewportHeight - targetHeight) / 2;

  const flipTransform = (() => {
    if (!sourceRect) return 'none';
    if (isAnimating) {
      const scaleX = sourceRect.width / targetWidth;
      const scaleY = sourceRect.height / targetHeight;
      const transX = sourceRect.left - targetX;
      const transY = sourceRect.top - targetY;
      return `translate3d(${transX}px, ${transY}px, 0) scale(${scaleX}, ${scaleY})`;
    }
    return `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`;
  })();

  return (
    <>
      {/* Screen Reader Live Region */}
      <span className="sr-only" aria-live="polite">
        {ariaAnnouncement}
      </span>

      {/* Top Nav Logo Anchor */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex items-center gap-2 cursor-pointer group select-none touch-none"
        title="ChillCast Home (Press and hold to inspect logo)"
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* Mascot Logo */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 pointer-events-none">
          <Image
            src="/myujiku-logo.png"
            alt="ChillCast Logo"
            width={36}
            height={36}
            draggable={false}
            className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(255,255,255,0.12)] pointer-events-none select-none"
            priority
          />
        </div>

        {/* Stylized Text */}
        <div className="relative h-6 sm:h-7 flex items-center transition-transform group-hover:scale-105 shrink-0 pointer-events-none">
          <Image
            src="/myujiku-text.png"
            alt="ChillCast"
            width={78}
            height={30}
            draggable={false}
            className="h-5 sm:h-6 w-auto object-contain pointer-events-none select-none"
            priority
          />
        </div>
      </div>

      {/* Enlarged Inspection View (Portal) */}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={closeInspect}
            onWheel={handleWheel}
            className="fixed inset-0 z-[999999] flex items-center justify-center pointer-events-auto select-none"
            style={{
              background: 'transparent', // STRICT REQUIREMENT: No card, no panel, no backdrop color, no dimmed overlay
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={handleDoubleClick}
              onPointerDown={handlePanDown}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanUp}
              className="flex items-center justify-center gap-4 cursor-zoom-out touch-none"
              style={{
                width: `${targetWidth}px`,
                height: `${targetHeight}px`,
                transform: flipTransform,
                transition: isAnimating ? 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                willChange: 'transform',
                cursor: zoomScale > 1.05 ? 'grab' : 'zoom-in',
              }}
              title="Double-click to reset zoom | Scroll to zoom | Drag to pan | Esc to close"
            >
              {/* Mascot Logo (High Resolution) */}
              <div className="relative w-1/3 aspect-square flex items-center justify-center shrink-0 pointer-events-none">
                <Image
                  src="/myujiku-logo.png"
                  alt="MyuJiku Logo Large"
                  width={256}
                  height={256}
                  draggable={false}
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                  priority
                />
              </div>

              {/* Stylized Brand Name */}
              <div className="relative w-2/3 h-1/2 flex items-center justify-center shrink-0 pointer-events-none">
                <Image
                  src="/myujiku-text.png"
                  alt="MyuJiku Text Large"
                  width={512}
                  height={180}
                  draggable={false}
                  className="w-full h-auto object-contain filter drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                  priority
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

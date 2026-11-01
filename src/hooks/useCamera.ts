'use client';

import { useRef, useEffect } from 'react';

export interface CameraFocusTarget {
  x: number;
  y: number;
  zoom?: number;
}

export interface UseCameraOptions {
  /** Ref to the container DOM element that will receive the CSS transform */
  worldRef: React.RefObject<HTMLElement | null>;
  /** Optional ref to outer stage container to measure viewport bounds */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Focus target in world or relative coordinates (active word position) */
  target: CameraFocusTarget | null;
  /** Whether camera movement is enabled (defaults to true) */
  enabled?: boolean;
  /** Settle time for critically-damped spring in seconds (e.g. 0.5s - 0.7s) */
  settleTime?: number;
  /** How strongly the camera pans toward target (0.0 to 1.0; Constellation uses e.g. 0.12) */
  followStrength?: number;
  /** Target base zoom level (e.g. 1.0, 1.35, 1.75) */
  zoomLevel?: number;
  /** Amount to pulse zoom on word activation (e.g. 0.08 in Ship) */
  zoomPulseAmount?: number;
  /** Idle floating drift amplitude in px (0 for none) */
  idleDriftAmount?: number;
  /** Active word duration in seconds (to dynamically shorten settle time on fast words) */
  wordDuration?: number;
  /** Coordinate mode: 'relative' (center offset) or 'world' (absolute canvas coordinates) */
  coordinateMode?: 'relative' | 'world';
  /** World dimensions for 'world' mode */
  worldWidth?: number;
  worldHeight?: number;
  /** Optional extra 3D CSS transform suffix (e.g. for Ship: "rotateX(10deg) rotateY(-4deg)") */
  transformSuffix?: string;
}

/**
 * Exact analytical solution for critically-damped spring step.
 * Guaranteed: zero overshoot, zero jitter, unconditional stability at any dt.
 */
function criticallyDampedStep(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number
): [newPos: number, newVel: number] {
  const x0 = current - target;
  const expTerm = Math.exp(-omega * dt);
  const b = velocity + omega * x0;
  const newPos = target + (x0 + b * dt) * expTerm;
  const newVel = (velocity - omega * b * dt) * expTerm;
  return [newPos, newVel];
}

export function useCamera({
  worldRef,
  containerRef,
  target,
  enabled = true,
  settleTime = 0.6,
  followStrength = 1.0,
  zoomLevel = 1.0,
  zoomPulseAmount = 0,
  idleDriftAmount = 0,
  wordDuration,
  coordinateMode = 'relative',
  worldWidth = 2400,
  worldHeight = 1600,
  transformSuffix = '',
}: UseCameraOptions) {
  // Store latest props in refs to avoid recreating rAF loop
  const optionsRef = useRef({
    enabled,
    target,
    settleTime,
    followStrength,
    zoomLevel,
    zoomPulseAmount,
    idleDriftAmount,
    wordDuration,
    coordinateMode,
    worldWidth,
    worldHeight,
    transformSuffix,
  });

  optionsRef.current = {
    enabled,
    target,
    settleTime,
    followStrength,
    zoomLevel,
    zoomPulseAmount,
    idleDriftAmount,
    wordDuration,
    coordinateMode,
    worldWidth,
    worldHeight,
    transformSuffix,
  };

  // State refs for physics
  const currentPosRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    zoom: zoomLevel,
    vZoom: 0,
  });

  const lastTargetRef = useRef<CameraFocusTarget | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isMovingRef = useRef<boolean>(false);

  // Transition handling for toggling ON <-> OFF smoothly in 300ms
  const disablingTransitionRef = useRef<{
    active: boolean;
    startTime: number;
    startX: number;
    startY: number;
    startZoom: number;
  }>({
    active: false,
    startTime: 0,
    startX: 0,
    startY: 0,
    startZoom: 1.0,
  });

  // Track target changes for zoom-pulse and seek acceleration
  useEffect(() => {
    if (!target) return;

    const prev = lastTargetRef.current;
    if (prev) {
      const dist = Math.hypot(target.x - prev.x, target.y - prev.y);

      // On seeks / sudden large jumps, boost velocity toward target so camera moves swiftly
      if (dist > 350) {
        currentPosRef.current.vx *= 0.2;
        currentPosRef.current.vy *= 0.2;
      }

      // Add zoom pulse on word change if configured
      if (zoomPulseAmount > 0 && (prev.x !== target.x || prev.y !== target.y)) {
        currentPosRef.current.zoom = Math.max(
          currentPosRef.current.zoom,
          zoomLevel + zoomPulseAmount
        );
      }
    }
    lastTargetRef.current = target;
  }, [target, zoomPulseAmount, zoomLevel]);

  // Handle enabled toggle transitions (300ms smooth return to neutral framing)
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    if (prevEnabledRef.current !== enabled) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (!enabled) {
        if (prefersReduced) {
          // Snap immediately to neutral
          disablingTransitionRef.current.active = false;
          if (worldRef.current) {
            worldRef.current.style.transform = '';
            worldRef.current.style.willChange = 'auto';
          }
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        } else {
          // Animate back to neutral over 300ms
          disablingTransitionRef.current = {
            active: true,
            startTime: performance.now(),
            startX: currentPosRef.current.x,
            startY: currentPosRef.current.y,
            startZoom: currentPosRef.current.zoom,
          };
        }
      } else {
        // Toggled back ON: cancel disabling and resume smoothly from current position
        disablingTransitionRef.current.active = false;
        lastTimeRef.current = performance.now();
      }
      prevEnabledRef.current = enabled;
    }
  }, [enabled, worldRef]);

  // Main rAF animation loop
  useEffect(() => {
    let isCancelled = false;

    // Check prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // If disabled and not in 300ms disabling transition, apply static framing and do not run loop
    if (!enabled && !disablingTransitionRef.current.active) {
      if (worldRef.current) {
        worldRef.current.style.transform = '';
        worldRef.current.style.willChange = 'auto';
      }
      return;
    }

    const loop = (now: number) => {
      if (isCancelled) return;

      const opts = optionsRef.current;
      const el = worldRef.current;
      if (!el) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Compute delta time capped at 64ms (avoids spiral on background lag)
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.064);
      lastTimeRef.current = now;

      // Viewport dimensions
      const container = containerRef?.current || el.parentElement || el;
      const viewportW = container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);
      const viewportH = container.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

      // Handle 300ms disabling transition
      if (disablingTransitionRef.current.active) {
        const elapsed = now - disablingTransitionRef.current.startTime;
        const progress = Math.min(1.0, elapsed / 300);
        // Smooth cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3);

        const neutralX = opts.coordinateMode === 'world' ? opts.worldWidth / 2 : 0;
        const neutralY = opts.coordinateMode === 'world' ? opts.worldHeight / 2 : 0;
        const fitScale = opts.coordinateMode === 'world'
          ? Math.min(viewportW / opts.worldWidth, viewportH / opts.worldHeight) * 0.95
          : 1.0;

        const curX = disablingTransitionRef.current.startX + (neutralX - disablingTransitionRef.current.startX) * ease;
        const curY = disablingTransitionRef.current.startY + (neutralY - disablingTransitionRef.current.startY) * ease;
        const curZoom = disablingTransitionRef.current.startZoom + (fitScale - disablingTransitionRef.current.startZoom) * ease;

        currentPosRef.current.x = curX;
        currentPosRef.current.y = curY;
        currentPosRef.current.zoom = curZoom;
        currentPosRef.current.vx = 0;
        currentPosRef.current.vy = 0;
        currentPosRef.current.vZoom = 0;

        let transform = '';
        if (opts.coordinateMode === 'world') {
          const tx = (viewportW - opts.worldWidth * curZoom) / 2;
          const ty = (viewportH - opts.worldHeight * curZoom) / 2;
          transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${curZoom.toFixed(4)})`;
        } else {
          transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0px) scale(${curZoom.toFixed(4)}) ${opts.transformSuffix}`.trim();
        }

        el.style.transform = transform;

        if (progress >= 1.0) {
          disablingTransitionRef.current.active = false;
          el.style.transform = opts.coordinateMode === 'world' ? transform : '';
          el.style.willChange = 'auto';
          // End loop now that disabled state is settled
          return;
        }

        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // If camera movement is disabled and reduced motion active:
      if (!opts.enabled || prefersReduced) {
        el.style.transform = '';
        el.style.willChange = 'auto';
        return;
      }

      // Compute effective spring settle time (shorten if word duration is fast)
      let effectiveSettle = opts.settleTime;
      if (opts.wordDuration && opts.wordDuration > 0) {
        effectiveSettle = Math.max(0.22, Math.min(opts.settleTime, opts.wordDuration * 0.85));
      }
      const omega = 4.5 / effectiveSettle;

      // Idle drift computation
      let driftX = 0;
      let driftY = 0;
      if (opts.idleDriftAmount > 0) {
        const driftTime = now * 0.001;
        driftX = Math.sin(driftTime * 0.7) * opts.idleDriftAmount + Math.cos(driftTime * 1.3) * (opts.idleDriftAmount * 0.4);
        driftY = Math.cos(driftTime * 0.6) * opts.idleDriftAmount + Math.sin(driftTime * 1.1) * (opts.idleDriftAmount * 0.4);
      }

      // Target determination based on coordinate mode
      let targetX = 0;
      let targetY = 0;
      let targetZoom = opts.zoomLevel;

      if (opts.coordinateMode === 'world') {
        if (opts.target) {
          targetX = opts.target.x + driftX;
          targetY = opts.target.y + driftY;
          targetZoom = opts.target.zoom || opts.zoomLevel;
        } else {
          targetX = opts.worldWidth / 2 + driftX;
          targetY = opts.worldHeight / 2 + driftY;
          targetZoom = opts.zoomLevel;
        }
      } else {
        // 'relative' mode (Ship, Constellation, Web)
        if (opts.target) {
          targetX = -opts.target.x * opts.followStrength + driftX;
          targetY = -opts.target.y * opts.followStrength + driftY;
          targetZoom = opts.target.zoom || opts.zoomLevel;
        } else {
          targetX = driftX;
          targetY = driftY;
          targetZoom = opts.zoomLevel;
        }
      }

      // Integrate critically-damped spring
      const [newX, newVx] = criticallyDampedStep(
        currentPosRef.current.x,
        currentPosRef.current.vx,
        targetX,
        omega,
        dt
      );
      const [newY, newVy] = criticallyDampedStep(
        currentPosRef.current.y,
        currentPosRef.current.vy,
        targetY,
        omega,
        dt
      );
      const [newZoom, newVZoom] = criticallyDampedStep(
        currentPosRef.current.zoom,
        currentPosRef.current.vZoom,
        targetZoom,
        omega * 0.9,
        dt
      );

      // Clamp camera so active word NEVER leaves the central 60% of viewport
      let clampedX = newX;
      let clampedY = newY;

      if (opts.coordinateMode === 'world' && opts.target) {
        const maxOffsetW = (viewportW * 0.35) / newZoom;
        const maxOffsetH = (viewportH * 0.35) / newZoom;
        const diffX = opts.target.x - clampedX;
        const diffY = opts.target.y - clampedY;

        if (Math.abs(diffX) > maxOffsetW) {
          clampedX = opts.target.x - Math.sign(diffX) * maxOffsetW;
        }
        if (Math.abs(diffY) > maxOffsetH) {
          clampedY = opts.target.y - Math.sign(diffY) * maxOffsetH;
        }
      }

      currentPosRef.current.x = clampedX;
      currentPosRef.current.y = clampedY;
      currentPosRef.current.vx = newVx;
      currentPosRef.current.vy = newVy;
      currentPosRef.current.zoom = newZoom;
      currentPosRef.current.vZoom = newVZoom;

      // Check moving state for will-change optimization
      const isMoving =
        Math.abs(newVx) > 0.4 ||
        Math.abs(newVy) > 0.4 ||
        Math.abs(newVZoom) > 0.003 ||
        opts.idleDriftAmount > 0;

      if (isMoving !== isMovingRef.current) {
        isMovingRef.current = isMoving;
        el.style.willChange = isMoving ? 'transform' : 'auto';
      }

      // Construct and apply transform directly on ref
      let transform = '';
      if (opts.coordinateMode === 'world') {
        const tx = viewportW / 2 - clampedX * newZoom;
        const ty = viewportH / 2 - clampedY * newZoom;
        transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${newZoom.toFixed(4)})`;
      } else {
        transform = `translate3d(${clampedX.toFixed(2)}px, ${clampedY.toFixed(2)}px, 0px) scale(${newZoom.toFixed(4)}) ${opts.transformSuffix}`.trim();
      }

      el.style.transform = transform;

      rafIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(loop);

    // Pause loop when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else {
        lastTimeRef.current = performance.now();
        if (optionsRef.current.enabled && !rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(loop);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (worldRef.current) {
        worldRef.current.style.willChange = 'auto';
      }
    };
  }, [enabled, worldRef, containerRef]);
}

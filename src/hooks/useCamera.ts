'use client';

import { useRef, useEffect, useLayoutEffect } from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
  /** Focus target in relative coordinates from world center */
  target: CameraFocusTarget | null;
  /** Whether camera movement is enabled (defaults to true) */
  enabled?: boolean;
  /** Settle time for critically-damped spring in seconds (e.g. 0.5s - 0.7s) */
  settleTime?: number;
  /** How strongly the camera pans toward target (0.0 to 1.0; Constellation uses e.g. 0.12) */
  followStrength?: number;
  /** Target base zoom level (e.g. 1.0, 1.35, 1.8) */
  zoomLevel?: number;
  /** Amount to pulse zoom on word activation (e.g. 0.08 in Ship) */
  zoomPulseAmount?: number;
  /** Idle floating drift amplitude in px (0 for none) */
  idleDriftAmount?: number;
  /** Active word duration in seconds (to dynamically shorten settle time on fast words) */
  wordDuration?: number;
  /** Optional extra 3D CSS transform suffix (e.g. for Ship: "rotateX(10deg) rotateY(-4deg)") */
  transformSuffix?: string;
  /** Whether pan offset scales with zoom (true for Camera style where center offset is magnified by zoom) */
  scalePanWithZoom?: boolean;
  /** Static neutral X when camera motion is disabled (default 0) */
  neutralX?: number;
  /** Static neutral Y when camera motion is disabled (e.g. Ship centers active word even when static) */
  neutralY?: number;
  /** Static neutral zoom when camera motion is disabled (default 1.0) */
  neutralZoom?: number;
  /** Optional coordinate mode descriptor */
  coordinateMode?: 'relative' | 'world';
  /** Optional key (e.g. trackId) that snaps camera immediately when changed */
  resetKey?: string | number;
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
  target,
  enabled = true,
  settleTime = 0.6,
  followStrength = 1.0,
  zoomLevel = 1.0,
  zoomPulseAmount = 0,
  idleDriftAmount = 0,
  wordDuration,
  transformSuffix = '',
  scalePanWithZoom = false,
  neutralX = 0,
  neutralY = 0,
  neutralZoom = 1.0,
  resetKey,
}: UseCameraOptions) {
  // Store latest props in refs to avoid recreation
  const optionsRef = useRef({
    enabled,
    target,
    settleTime,
    followStrength,
    zoomLevel,
    zoomPulseAmount,
    idleDriftAmount,
    wordDuration,
    transformSuffix,
    scalePanWithZoom,
    neutralX,
    neutralY,
    neutralZoom,
    resetKey,
  });

  useIsomorphicLayoutEffect(() => {
    optionsRef.current = {
      enabled,
      target,
      settleTime,
      followStrength,
      zoomLevel,
      zoomPulseAmount,
      idleDriftAmount,
      wordDuration,
      transformSuffix,
      scalePanWithZoom,
      neutralX,
      neutralY,
      neutralZoom,
      resetKey,
    };
  });

  const initializedRef = useRef(false);
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

  // Smooth 300ms transition when toggling ON <-> OFF
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

  // Reset camera position immediately when resetKey (e.g. trackId) changes
  const prevResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      initializedRef.current = false;
      lastTargetRef.current = null;
      currentPosRef.current.vx = 0;
      currentPosRef.current.vy = 0;
      currentPosRef.current.vZoom = 0;
    }
  }, [resetKey]);

  // Apply initial transform synchronously before first paint to prevent any 1-frame flash
  useIsomorphicLayoutEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    if (!initializedRef.current) {
      if (!enabled) {
        currentPosRef.current.x = neutralX;
        currentPosRef.current.y = neutralY;
        currentPosRef.current.zoom = neutralZoom;
        initializedRef.current = true;
        el.style.transform = `translate3d(${neutralX.toFixed(2)}px, ${neutralY.toFixed(2)}px, 0px) scale(${neutralZoom.toFixed(4)}) ${transformSuffix}`.trim();
        return;
      }
      if (target) {
        const initZoom = target.zoom || zoomLevel;
        const initPanX = scalePanWithZoom ? -target.x * initZoom : -target.x * followStrength;
        const initPanY = scalePanWithZoom ? -target.y * initZoom : -target.y * followStrength;
        currentPosRef.current.x = initPanX;
        currentPosRef.current.y = initPanY;
        currentPosRef.current.zoom = initZoom;
        initializedRef.current = true;
        el.style.transform = `translate3d(${initPanX.toFixed(2)}px, ${initPanY.toFixed(2)}px, 0px) scale(${initZoom.toFixed(4)}) ${transformSuffix}`.trim();
      }
    }
  }, [worldRef, target, zoomLevel, scalePanWithZoom, followStrength, transformSuffix, enabled, neutralX, neutralY, neutralZoom]);

  // Track target changes for zoom-pulse and rapid catchup
  useEffect(() => {
    if (!target) return;

    const prev = lastTargetRef.current;
    if (prev) {
      const dist = Math.hypot(target.x - prev.x, target.y - prev.y);

      // On seeks or large position changes, accelerate smoothly or snap if very large
      if (dist > 1000) {
        const targetZoom = target.zoom || zoomLevel;
        const targetPanX = scalePanWithZoom ? -target.x * targetZoom : -target.x * followStrength;
        const targetPanY = scalePanWithZoom ? -target.y * targetZoom : -target.y * followStrength;
        currentPosRef.current.x = targetPanX;
        currentPosRef.current.y = targetPanY;
        currentPosRef.current.vx = 0;
        currentPosRef.current.vy = 0;
      } else if (dist > 300) {
        currentPosRef.current.vx *= 0.3;
        currentPosRef.current.vy *= 0.3;
      }

      // Add zoom pulse on word activation
      if (zoomPulseAmount > 0 && (prev.x !== target.x || prev.y !== target.y)) {
        currentPosRef.current.zoom = Math.max(
          currentPosRef.current.zoom,
          zoomLevel + zoomPulseAmount
        );
      }
    }
    lastTargetRef.current = target;
  }, [target, zoomPulseAmount, zoomLevel, scalePanWithZoom, followStrength]);

  // Handle toggling camera movement setting smoothly
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    if (prevEnabledRef.current !== enabled) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (!enabled) {
        if (prefersReduced) {
          disablingTransitionRef.current.active = false;
          if (worldRef.current) {
            const staticTransform = `translate3d(${neutralX.toFixed(2)}px, ${neutralY.toFixed(2)}px, 0px) scale(${neutralZoom.toFixed(4)}) ${transformSuffix}`.trim();
            worldRef.current.style.transform = staticTransform;
            worldRef.current.style.willChange = 'auto';
          }
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        } else {
          disablingTransitionRef.current = {
            active: true,
            startTime: performance.now(),
            startX: currentPosRef.current.x,
            startY: currentPosRef.current.y,
            startZoom: currentPosRef.current.zoom,
          };
        }
      } else {
        disablingTransitionRef.current.active = false;
        lastTimeRef.current = performance.now();
      }
      prevEnabledRef.current = enabled;
    }
  }, [enabled, worldRef, neutralX, neutralY, neutralZoom, transformSuffix]);

  // Main rAF animation loop
  useEffect(() => {
    let isCancelled = false;
    const worldEl = worldRef.current;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // If disabled and not in 300ms transition, apply static framing and stop loop
    if (!enabled && !disablingTransitionRef.current.active) {
      if (worldEl) {
        const staticTransform = `translate3d(${neutralX.toFixed(2)}px, ${neutralY.toFixed(2)}px, 0px) scale(${neutralZoom.toFixed(4)}) ${transformSuffix}`.trim();
        worldEl.style.transform = staticTransform;
        worldEl.style.willChange = 'auto';
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

      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.064);
      lastTimeRef.current = now;

      // Handle 300ms disabling transition
      if (disablingTransitionRef.current.active) {
        const elapsed = now - disablingTransitionRef.current.startTime;
        const progress = Math.min(1.0, elapsed / 300);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

        const curX = disablingTransitionRef.current.startX + (opts.neutralX - disablingTransitionRef.current.startX) * ease;
        const curY = disablingTransitionRef.current.startY + (opts.neutralY - disablingTransitionRef.current.startY) * ease;
        const curZoom = disablingTransitionRef.current.startZoom + (opts.neutralZoom - disablingTransitionRef.current.startZoom) * ease;

        currentPosRef.current.x = curX;
        currentPosRef.current.y = curY;
        currentPosRef.current.zoom = curZoom;
        currentPosRef.current.vx = 0;
        currentPosRef.current.vy = 0;
        currentPosRef.current.vZoom = 0;

        const transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0px) scale(${curZoom.toFixed(4)}) ${opts.transformSuffix}`.trim();
        el.style.transform = transform;

        if (progress >= 1.0) {
          disablingTransitionRef.current.active = false;
          el.style.willChange = 'auto';
          return;
        }

        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // If disabled and reduced motion:
      if (!opts.enabled || prefersReduced) {
        const staticTransform = `translate3d(${opts.neutralX.toFixed(2)}px, ${opts.neutralY.toFixed(2)}px, 0px) scale(${opts.neutralZoom.toFixed(4)}) ${opts.transformSuffix}`.trim();
        el.style.transform = staticTransform;
        el.style.willChange = 'auto';
        return;
      }

      // Spring stiffness (omega): dynamically shortens settle time when words are rapid
      let effectiveSettle = opts.settleTime;
      if (opts.wordDuration && opts.wordDuration > 0) {
        effectiveSettle = Math.max(0.25, Math.min(opts.settleTime, opts.wordDuration * 0.85));
      }
      const omega = 4.5 / effectiveSettle;

      // Idle drift computation
      let driftX = 0;
      let driftY = 0;
      if (opts.idleDriftAmount > 0) {
        const driftTime = now * 0.001;
        driftX = Math.sin(driftTime * 0.7) * opts.idleDriftAmount + Math.cos(driftTime * 1.3) * (opts.idleDriftAmount * 0.35);
        driftY = Math.cos(driftTime * 0.6) * opts.idleDriftAmount + Math.sin(driftTime * 1.1) * (opts.idleDriftAmount * 0.35);
      }

      // Calculate target pan and zoom
      let targetPanX = 0;
      let targetPanY = 0;
      const targetZoom = opts.target?.zoom || opts.zoomLevel;

      if (opts.target) {
        if (opts.scalePanWithZoom) {
          targetPanX = -opts.target.x * targetZoom + driftX;
          targetPanY = -opts.target.y * targetZoom + driftY;
        } else {
          targetPanX = -opts.target.x * opts.followStrength + driftX;
          targetPanY = -opts.target.y * opts.followStrength + driftY;
        }
      } else {
        targetPanX = driftX;
        targetPanY = driftY;
      }

      // Initialize directly at target on first frame (prevents flying from 0)
      if (!initializedRef.current && opts.target) {
        currentPosRef.current.x = targetPanX;
        currentPosRef.current.y = targetPanY;
        currentPosRef.current.zoom = targetZoom;
        initializedRef.current = true;
      }

      // Integrate critically-damped spring
      const [newX, newVx] = criticallyDampedStep(
        currentPosRef.current.x,
        currentPosRef.current.vx,
        targetPanX,
        omega,
        dt
      );
      const [newY, newVy] = criticallyDampedStep(
        currentPosRef.current.y,
        currentPosRef.current.vy,
        targetPanY,
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

      currentPosRef.current.x = newX;
      currentPosRef.current.y = newY;
      currentPosRef.current.vx = newVx;
      currentPosRef.current.vy = newVy;
      currentPosRef.current.zoom = newZoom;
      currentPosRef.current.vZoom = newVZoom;

      // will-change optimization: keep text crisp at rest, apply transform will-change only while actively in motion
      const isMoving =
        Math.abs(newVx) > 0.4 ||
        Math.abs(newVy) > 0.4 ||
        Math.abs(newVZoom) > 0.003;

      if (isMoving !== isMovingRef.current) {
        isMovingRef.current = isMoving;
        el.style.willChange = isMoving ? 'transform' : 'auto';
      }

      // Apply transform directly to ref
      const transform = `translate3d(${newX.toFixed(2)}px, ${newY.toFixed(2)}px, 0px) scale(${newZoom.toFixed(4)}) ${opts.transformSuffix}`.trim();
      el.style.transform = transform;

      rafIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(loop);

    // Pause when tab is hidden
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
      if (worldEl) {
        worldEl.style.willChange = 'auto';
      }
    };
  }, [enabled, worldRef, neutralX, neutralY, neutralZoom, transformSuffix]);
}

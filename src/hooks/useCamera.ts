'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CameraMovementSetting } from '@/lib/lyrics/settings';

export interface CameraTarget {
  x: number;
  y: number;
  zoom?: number;
  rotX?: number;
  rotY?: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotX: number;
  rotY: number;
  parallaxX: number;
  parallaxY: number;
  transform: string;
}

interface UseCameraOptions {
  movement: CameraMovementSetting;
  userZoom?: number; // 0.5 to 2.0
  viewportWidth?: number;
  viewportHeight?: number;
  isPaused?: boolean;
  reducedMotion?: boolean;
}

export function useCamera(
  target: CameraTarget,
  options: UseCameraOptions
) {
  const {
    movement = 'subtle',
    userZoom = 1.0,
    viewportWidth = 1000,
    viewportHeight = 600,
    isPaused = false,
    reducedMotion = false,
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>({
    x: target.x,
    y: target.y,
    zoom: userZoom,
    rotX: 0,
    rotY: 0,
    parallaxX: 0,
    parallaxY: 0,
    transform: 'none',
  });

  // Current physics state
  const posRef = useRef({
    x: target.x,
    y: target.y,
    vx: 0,
    vy: 0,
    zoom: userZoom,
    vZoom: 0,
    rotX: 0,
    rotY: 0,
  });

  const lastTargetRef = useRef<CameraTarget>(target);
  const jumpDollyRef = useRef<number>(1.0);

  // Detect sudden target jumps (e.g. seek or new verse far away)
  useEffect(() => {
    const prev = lastTargetRef.current;
    const dist = Math.hypot(target.x - prev.x, target.y - prev.y);
    if (dist > 280 && movement !== 'off' && !reducedMotion) {
      // Zoom out briefly during jump (eases out then settles back in)
      jumpDollyRef.current = 0.86;
    }
    lastTargetRef.current = target;
  }, [target, movement, reducedMotion]);

  useEffect(() => {
    if (movement === 'off' || reducedMotion) {
      // Static framing
      const transform = `scale(${userZoom})`;
      setCameraState({
        x: 0,
        y: 0,
        zoom: userZoom,
        rotX: 0,
        rotY: 0,
        parallaxX: 0,
        parallaxY: 0,
        transform,
      });
      return;
    }

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;

      // Spring parameters (~0.5 - 0.7s critically damped settle)
      const omega = movement === 'cinematic' ? 7.0 : 8.5; // rad/s
      const damping = 1.0; // critically damped

      // Idle drift / parallax
      const driftSpeed = now * 0.0008;
      const driftAmpX = movement === 'cinematic' ? 14 : 7;
      const driftAmpY = movement === 'cinematic' ? 10 : 5;
      const driftX = Math.sin(driftSpeed) * driftAmpX;
      const driftY = Math.cos(driftSpeed * 0.7) * driftAmpY;

      // Desired target clamped to keep focus within central 60% of viewport
      const halfW = viewportWidth / 2;
      const halfH = viewportHeight / 2;
      const maxClampX = halfW * 0.3;
      const maxClampY = halfH * 0.3;

      const targetX = target.x + driftX;
      const targetY = target.y + driftY;

      // Recover jump dolly
      jumpDollyRef.current += (1.0 - jumpDollyRef.current) * Math.min(1.0, dt * 3.5);

      const targetZoom = (target.zoom ?? 1.0) * userZoom * jumpDollyRef.current;
      const targetRotX = movement === 'cinematic' ? (target.rotX ?? 0) + Math.sin(driftSpeed * 0.5) * 4 : 0;
      const targetRotY = movement === 'cinematic' ? (target.rotY ?? 0) + Math.cos(driftSpeed * 0.6) * 5 : 0;

      // Semi-implicit spring integration for X
      const forceX = -Math.pow(omega, 2) * (posRef.current.x - targetX) - 2 * damping * omega * posRef.current.vx;
      posRef.current.vx += forceX * dt;
      posRef.current.x += posRef.current.vx * dt;

      // Semi-implicit spring integration for Y
      const forceY = -Math.pow(omega, 2) * (posRef.current.y - targetY) - 2 * damping * omega * posRef.current.vy;
      posRef.current.vy += forceY * dt;
      posRef.current.y += posRef.current.vy * dt;

      // Spring integration for Zoom
      const forceZoom = -Math.pow(omega * 0.8, 2) * (posRef.current.zoom - targetZoom) - 2 * damping * (omega * 0.8) * posRef.current.vZoom;
      posRef.current.vZoom += forceZoom * dt;
      posRef.current.zoom += posRef.current.vZoom * dt;

      // Rotations
      posRef.current.rotX += (targetRotX - posRef.current.rotX) * Math.min(1.0, dt * 5.0);
      posRef.current.rotY += (targetRotY - posRef.current.rotY) * Math.min(1.0, dt * 5.0);

      // Clamp focus within central 60% relative to camera center
      const offsetX = target.x - posRef.current.x;
      const offsetY = target.y - posRef.current.y;
      if (Math.abs(offsetX) > maxClampX) {
        posRef.current.x = target.x - Math.sign(offsetX) * maxClampX;
      }
      if (Math.abs(offsetY) > maxClampY) {
        posRef.current.y = target.y - Math.sign(offsetY) * maxClampY;
      }

      // Parallax for background layers
      const parallaxFactor = 0.08;
      const px = -posRef.current.x * parallaxFactor;
      const py = -posRef.current.y * parallaxFactor;

      const tx = -(posRef.current.x - halfW);
      const ty = -(posRef.current.y - halfH);

      const transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${posRef.current.zoom.toFixed(4)}) rotateX(${posRef.current.rotX.toFixed(2)}deg) rotateY(${posRef.current.rotY.toFixed(2)}deg)`;

      setCameraState({
        x: posRef.current.x,
        y: posRef.current.y,
        zoom: posRef.current.zoom,
        rotX: posRef.current.rotX,
        rotY: posRef.current.rotY,
        parallaxX: px,
        parallaxY: py,
        transform,
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    movement,
    userZoom,
    target.x,
    target.y,
    target.zoom,
    target.rotX,
    target.rotY,
    viewportWidth,
    viewportHeight,
    isPaused,
    reducedMotion,
  ]);

  return cameraState;
}

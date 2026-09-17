'use client';

import React, { useEffect, useRef } from 'react';
import { AMBIENT_SCENES, AmbientScene, SceneId } from '@/types/scenes';

interface AmbientBackgroundProps {
  activeSceneId: SceneId;
  dimmerOpacity: number; // 0.05 to 0.75
  isPaused: boolean;
}

export default function AmbientBackground({
  activeSceneId,
  dimmerOpacity,
  isPaused,
}: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeScene: AmbientScene =
    AMBIENT_SCENES.find((s) => s.id === activeSceneId) || AMBIENT_SCENES[0];

  // Hardware-accelerated video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeScene.type !== 'video') return;

    video.muted = true;
    video.defaultMuted = true;

    if (isPaused) {
      video.pause();
    } else {
      video.play().catch(() => {
        const startVideo = () => {
          video.play().catch(() => {});
          window.removeEventListener('click', startVideo);
          window.removeEventListener('keydown', startVideo);
        };
        window.addEventListener('click', startVideo, { once: true });
        window.addEventListener('keydown', startVideo, { once: true });
      });
    }
  }, [isPaused, activeScene.id, activeScene.type]);

  // Procedural Canvas ambient particles ONLY when canvas scene is active
  useEffect(() => {
    if (activeScene.type !== 'canvas') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -Math.random() * 0.35 - 0.08,
      opacity: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseAngle: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isPaused) {
        for (const p of particles) {
          p.x += p.speedX;
          p.y += p.speedY;
          p.pulseAngle += p.pulseSpeed;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const currentOpacity =
            p.opacity * (0.65 + 0.35 * Math.sin(p.pulseAngle));

          ctx.fillStyle = `rgba(16, 185, 129, ${currentOpacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeScene.type, isPaused]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[#05070c] transform-gpu will-change-transform">
      {/* 1. Looping Muted Background Video */}
      {activeScene.type === 'video' && activeScene.videoUrl && (
        <video
          ref={videoRef}
          key={activeScene.videoUrl}
          src={activeScene.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transform-gpu scale-[1.02] filter brightness-105 contrast-100 will-change-transform"
        />
      )}

      {/* 2. Procedural Glowing Particle Canvas (rendered only on canvas scene) */}
      {activeScene.type === 'canvas' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none transform-gpu"
        />
      )}

      {/* 3. Pure CSS Radial Gradients (Zero runtime GPU blur cost) */}
      <div
        className="absolute -top-32 -left-32 w-[550px] h-[550px] pointer-events-none opacity-25 transition-colors duration-700"
        style={{
          background: `radial-gradient(circle, ${activeScene.accentColor} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[550px] h-[550px] pointer-events-none opacity-20 transition-colors duration-700"
        style={{
          background: `radial-gradient(circle, ${activeScene.accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* 4. Adjustable Dark Scrim */}
      <div
        className="absolute inset-0 transition-opacity duration-300 bg-black/45 will-change-opacity"
        style={{ opacity: dimmerOpacity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
    </div>
  );
}

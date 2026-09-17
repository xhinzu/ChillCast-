'use client';

import React, { useEffect, useRef } from 'react';
import { AMBIENT_SCENES, AmbientScene, SceneId } from '@/types/scenes';

interface AmbientBackgroundProps {
  activeSceneId: SceneId;
  dimmerOpacity: number; // 0.2 to 0.85
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

  // Robust HTML5 Video Autoplay Handling (Chrome / Edge / Firefox)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    if (isPaused) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If autoplay was blocked by browser before user interaction,
          // listen for first interaction on window to play cleanly
          const handleFirstClick = () => {
            video.play().catch(() => {});
            window.removeEventListener('click', handleFirstClick);
            window.removeEventListener('keydown', handleFirstClick);
          };
          window.addEventListener('click', handleFirstClick, { once: true });
          window.addEventListener('keydown', handleFirstClick, { once: true });
        });
      }
    }
  }, [isPaused, activeSceneId]);

  // Procedural Canvas ambient particles (for 'fireflies' or subtle atmospheric dust)
  useEffect(() => {
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

    const particleCount = activeScene.type === 'canvas' ? 55 : 18;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 3.5 + 1,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: -Math.random() * 0.45 - 0.1,
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

          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.radius * 2.5
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
          grad.addColorStop(0.5, `${activeScene.accentColor}33`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
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
  }, [activeScene, isPaused]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[#07090e]">
      {/* 1. Looping Muted Background Video */}
      {activeScene.type === 'video' && activeScene.videoUrl && (
        <video
          ref={videoRef}
          key={activeScene.id}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transform-gpu scale-105 transition-opacity duration-1000 filter brightness-95 contrast-105"
        >
          <source src={activeScene.videoUrl} type="video/webm" />
        </video>
      )}

      {/* 2. Procedural Glowing Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transform-gpu"
      />

      {/* 3. Deep Color Atmospheric Gradients */}
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-25 transition-all duration-1000"
        style={{ backgroundColor: activeScene.accentColor }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[180px] opacity-20 transition-all duration-1000"
        style={{ backgroundColor: activeScene.accentColor }}
      />

      {/* 4. Adjustable Dark Scrim & Radial Vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-500 bg-gradient-to-b from-black/60 via-black/40 to-black/80"
        style={{ opacity: dimmerOpacity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
    </div>
  );
}

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

  // Robust HTML5 Video Playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeScene.type !== 'video') return;

    video.muted = true;
    video.defaultMuted = true;

    if (isPaused) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Retry on first user gesture if blocked by autoplay policy
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

    const particleCount = activeScene.type === 'canvas' ? 60 : 15;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 3.5 + 1,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: -Math.random() * 0.4 - 0.08,
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
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 bg-[#05070c]">
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
          className="absolute inset-0 w-full h-full object-cover transform-gpu scale-105 transition-opacity duration-700 filter brightness-105 contrast-100"
        />
      )}

      {/* 2. Procedural Glowing Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transform-gpu"
      />

      {/* 3. Subtle Atmospheric Accent Glows */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: activeScene.accentColor }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: activeScene.accentColor }}
      />

      {/* 4. Adjustable Dark Scrim (Kept gentle so the video is clearly visible) */}
      <div
        className="absolute inset-0 transition-opacity duration-300 bg-black/50"
        style={{ opacity: dimmerOpacity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)] pointer-events-none" />
    </div>
  );
}

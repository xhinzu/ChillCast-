'use client';

import React, { useEffect, useRef } from 'react';

interface LyricOverlaysProps {
  enabled: boolean;
  activeOverlays: string[];
  opacity?: number; // 0 to 100
  speed?: number; // 0.2 to 3.0
  blendMode?: string;
  raindropsVariant?: 'drizzle' | 'heavy';
  isTabHidden?: boolean;
  isLowQuality?: boolean;
  isForeground?: boolean; // if true, only renders raindrops on top of text
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  trail?: { x: number; y: number }[];
  color?: string;
}

export default function LyricOverlays({
  enabled,
  activeOverlays = [],
  opacity = 50,
  speed = 1.0,
  blendMode = 'screen',
  raindropsVariant = 'drizzle',
  isTabHidden = false,
  isLowQuality = false,
  isForeground = false,
}: LyricOverlaysProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // If master overlay is disabled or no active overlays, don't render
  const shouldRenderRaindrops = activeOverlays.includes('raindrops');
  const hasActiveOverlays = activeOverlays.length > 0;

  useEffect(() => {
    if (!enabled || !hasActiveOverlays || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pools
    const pCountMultiplier = isLowQuality ? 0.35 : 1.0;
    const particles: Particle[] = [];

    // Initialize particles based on active overlays
    if (activeOverlays.includes('snow')) {
      const count = Math.round(50 * pCountMultiplier);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8 * speed,
          vy: (0.8 + Math.random() * 1.5) * speed,
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.5,
          maxAlpha: 0.8,
          life: 0,
          maxLife: 1000,
        });
      }
    }

    if (activeOverlays.includes('embers')) {
      const count = Math.round(45 * pCountMultiplier);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: height + Math.random() * 40,
          vx: (Math.random() - 0.5) * 1.2 * speed,
          vy: -(1.2 + Math.random() * 2.2) * speed,
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.2 + Math.random() * 0.8,
          maxAlpha: 0.9,
          life: 0,
          maxLife: 300 + Math.random() * 300,
          color: Math.random() > 0.3 ? '#ef4444' : '#f59e0b',
        });
      }
    }

    if (activeOverlays.includes('fireflies')) {
      const count = Math.round(25 * pCountMultiplier);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.9 * speed,
          vy: (Math.random() - 0.5) * 0.9 * speed,
          size: 2.0 + Math.random() * 3.0,
          alpha: Math.random(),
          maxAlpha: 0.85,
          life: Math.random() * 200,
          maxLife: 200,
          color: '#a3e635',
        });
      }
    }

    if (activeOverlays.includes('dust')) {
      const count = Math.round(40 * pCountMultiplier);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4 * speed,
          vy: (Math.random() - 0.5) * 0.4 * speed,
          size: 1.0 + Math.random() * 2.0,
          alpha: 0.15 + Math.random() * 0.35,
          maxAlpha: 0.5,
          life: 0,
          maxLife: 1000,
        });
      }
    }

    // Raindrops on glass
    const raindrops: Particle[] = [];
    if (activeOverlays.includes('raindrops')) {
      const count = Math.round((raindropsVariant === 'heavy' ? 45 : 22) * pCountMultiplier);
      for (let i = 0; i < count; i++) {
        raindrops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (0.4 + Math.random() * 1.4) * speed,
          size: 2.5 + Math.random() * 4.0,
          alpha: 0.5 + Math.random() * 0.4,
          maxAlpha: 0.9,
          life: 0,
          maxLife: 600,
          trail: [],
        });
      }
    }

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isTabHidden) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Render general background particles
      if (!isForeground) {
        // Rain streaks
        if (activeOverlays.includes('rain_streaks')) {
          ctx.strokeStyle = 'rgba(180, 210, 255, 0.25)';
          ctx.lineWidth = 1.2;
          const streakCount = Math.round(40 * pCountMultiplier);
          for (let i = 0; i < streakCount; i++) {
            const rx = (Math.sin(now * 0.001 + i) * width + width) % width;
            const ry = ((now * 0.6 * speed + i * 50) % (height + 100)) - 50;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 8, ry + 24);
            ctx.stroke();
          }
        }

        // Stars / Twinkle
        if (activeOverlays.includes('stars')) {
          const starCount = Math.round(45 * pCountMultiplier);
          for (let i = 0; i < starCount; i++) {
            const sx = (i * 137.5) % width;
            const sy = (i * 93.7) % height;
            const tw = Math.sin(now * 0.003 * speed + i) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + tw * 0.6})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Bokeh orbs
        if (activeOverlays.includes('bokeh')) {
          const orbCount = Math.round(12 * pCountMultiplier);
          for (let i = 0; i < orbCount; i++) {
            const bx = (Math.sin(now * 0.0004 * speed + i * 2) * width * 0.4 + width * 0.5);
            const by = (Math.cos(now * 0.0005 * speed + i * 3) * height * 0.4 + height * 0.5);
            const rad = 25 + (i % 4) * 18;
            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
            grad.addColorStop(0.7, 'rgba(255, 200, 150, 0.05)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(bx, by, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Light leaks
        if (activeOverlays.includes('light_leaks')) {
          const leakX = width * 0.8 + Math.sin(now * 0.0006 * speed) * 80;
          const leakY = height * 0.2 + Math.cos(now * 0.0005 * speed) * 60;
          const grad = ctx.createRadialGradient(leakX, leakY, 0, leakX, leakY, width * 0.6);
          grad.addColorStop(0, 'rgba(255, 120, 50, 0.18)');
          grad.addColorStop(0.5, 'rgba(255, 80, 180, 0.08)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }

        // General particles (snow, embers, fireflies, dust)
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.color === '#a3e635') {
            // Firefly glow breathing
            p.life = (p.life + 1) % p.maxLife;
            p.alpha = Math.abs(Math.sin((p.life / p.maxLife) * Math.PI)) * p.maxAlpha;
          }

          // Wrap boundaries
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          ctx.fillStyle = p.color
            ? p.color
            : `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Raindrops on glass (foreground window pane layer)
      if (isForeground && shouldRenderRaindrops) {
        for (const drop of raindrops) {
          drop.y += drop.vy;
          drop.x += (Math.random() - 0.5) * 0.4;

          // Trail points
          if (!drop.trail) drop.trail = [];
          if (Math.random() > 0.4) {
            drop.trail.push({ x: drop.x, y: drop.y });
            if (drop.trail.length > 8) drop.trail.shift();
          }

          // Draw trail droplets
          for (let t = 0; t < drop.trail.length; t++) {
            const pt = drop.trail[t];
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + (t / drop.trail.length) * 0.25})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, drop.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw main droplet with glass refraction highlight
          const grad = ctx.createRadialGradient(
            drop.x - drop.size * 0.3,
            drop.y - drop.size * 0.3,
            0,
            drop.x,
            drop.y,
            drop.size
          );
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          grad.addColorStop(0.6, 'rgba(180, 220, 255, 0.4)');
          grad.addColorStop(1, 'rgba(40, 80, 120, 0.15)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(drop.x, drop.y, drop.size * 0.8, drop.size * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Reset droplet
          if (drop.y > height + 20) {
            drop.y = -20;
            drop.x = Math.random() * width;
            drop.trail = [];
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    enabled,
    activeOverlays,
    hasActiveOverlays,
    shouldRenderRaindrops,
    speed,
    raindropsVariant,
    isTabHidden,
    isLowQuality,
    isForeground,
  ]);

  if (!enabled || !hasActiveOverlays) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{
        zIndex: isForeground ? 25 : 5,
        opacity: opacity / 100,
        mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'],
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* CSS Overlays: Scanlines, Film Grain, Scratches */}
      {!isForeground && activeOverlays.includes('vhs') && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}

      {!isForeground && activeOverlays.includes('film_grain') && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-repeat animate-pulse"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 10%, transparent 11%)',
            backgroundSize: '4px 4px',
          }}
        />
      )}
    </div>
  );
}

import { WordEffectDef } from './types';
import { ParticlePool } from './ParticlePool';

/**
 * Procedural drawing helpers for canvas word effects.
 */

export function drawShockwave(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  color: string,
  lineWidth = 2
): void {
  if (alpha <= 0 || radius <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawProceduralHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number,
  crack = 0
): void {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.translate(cx, cy);

  if (crack > 0) {
    // Cracked heart: draw left and right half drifting apart
    const offset = crack * size * 0.25;
    // Left half
    ctx.save();
    ctx.translate(-offset, 0);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.bezierCurveTo(-size * 0.6, -size * 0.1, -size * 0.5, -size * 0.5, 0, -size * 0.2);
    ctx.lineTo(0, size * 0.4);
    ctx.fill();
    ctx.restore();

    // Right half
    ctx.save();
    ctx.translate(offset, 0);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.bezierCurveTo(size * 0.6, -size * 0.1, size * 0.5, -size * 0.5, 0, -size * 0.2);
    ctx.lineTo(0, size * 0.4);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, size * 0.35);
    // top left curve
    ctx.bezierCurveTo(-size * 0.5, -size * 0.1, -size * 0.5, -topCurveHeight * 1.5, 0, -topCurveHeight * 0.5);
    // top right curve
    ctx.bezierCurveTo(size * 0.5, -topCurveHeight * 1.5, size * 0.5, -size * 0.1, 0, size * 0.35);
    ctx.fill();
  }

  ctx.restore();
}

export function drawStarGlint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
  color: string,
  alpha: number
): void {
  if (alpha <= 0 || radius <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.lineTo(Math.cos((i * Math.PI) / 2) * radius, Math.sin((i * Math.PI) / 2) * radius);
    ctx.lineTo(
      Math.cos(((i + 0.5) * Math.PI) / 2) * (radius * 0.25),
      Math.sin(((i + 0.5) * Math.PI) / 2) * (radius * 0.25)
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawMusicNote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  isDouble = false
): void {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.12);

  // Note head (oval tilted 30 deg)
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.35, size * 0.25, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  const stemX = x + size * 0.28;
  const stemTop = y - size * 1.1;
  ctx.beginPath();
  ctx.moveTo(stemX, y);
  ctx.lineTo(stemX, stemTop);
  ctx.stroke();

  // Flag or beam
  if (isDouble) {
    // 2nd note head
    const x2 = x + size * 0.8;
    const y2 = y - size * 0.2;
    ctx.beginPath();
    ctx.ellipse(x2, y2, size * 0.35, size * 0.25, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 2nd stem
    const stemX2 = x2 + size * 0.28;
    ctx.beginPath();
    ctx.moveTo(stemX2, y2);
    ctx.lineTo(stemX2, stemTop - size * 0.2);
    ctx.stroke();

    // Beam connecting stems
    ctx.beginPath();
    ctx.lineWidth = size * 0.22;
    ctx.moveTo(stemX, stemTop);
    ctx.lineTo(stemX2, stemTop - size * 0.2);
    ctx.stroke();
  } else {
    // Flag curve
    ctx.beginPath();
    ctx.moveTo(stemX, stemTop);
    ctx.bezierCurveTo(stemX + size * 0.4, stemTop + size * 0.3, stemX + size * 0.3, stemTop + size * 0.7, stemX, stemTop + size * 0.6);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Common particle update utility.
 */
function updateParticles(pool: ParticlePool, indices: number[], dt: number, gravity = 0, drag = 1): void {
  for (let i = 0; i < indices.length; i++) {
    const p = pool.get(indices[i]);
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }
    p.vx *= drag;
    p.vy = (p.vy + gravity * dt) * drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.vRot * dt;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
  }
}

/**
 * Common particle draw utility.
 */
function drawParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool, indices: number[]): void {
  for (let i = 0; i < indices.length; i++) {
    const p = pool.get(indices[i]);
    if (!p.active || p.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(p.scaleX, p.scaleY);

    if (p.customType === 'spark') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.customType === 'shard') {
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size);
      ctx.lineTo(p.size, -p.size * 0.5);
      ctx.lineTo(0, p.size);
      ctx.closePath();
      ctx.fill();
    } else if (p.customType === 'heart') {
      drawProceduralHeart(ctx, 0, 0, p.size * 2, p.color, 1);
    } else if (p.customType === 'confetti') {
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
    } else if (p.customType === 'note') {
      drawMusicNote(ctx, 0, 0, p.size * 1.5, p.color, 1, (p.customData || 0) > 0.5);
    } else if (p.customType === 'coin') {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * Math.abs(Math.cos(p.rotation)), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff5a0';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * ALL 49 WORD EFFECT DEFINITIONS
 */
export const WORD_EFFECTS: WordEffectDef[] = [
  // ==========================================
  // 1. IMPACT & ENERGY (6 effects)
  // ==========================================
  {
    id: 'bomb',
    name: 'Bomb / Blast',
    category: 'impact',
    words: ['bomb', 'explode', 'blast', 'boom', 'bang', 'detonate'],
    intensity: 'normal',
    isBig: true,
    durationMs: 650,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const count = inst.params.strength === 'strong' ? 18 : inst.params.strength === 'subtle' ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
          const speed = 80 + Math.random() * 140;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 2 + Math.random() * 3;
          p.color = inst.params.naturalColors
            ? Math.random() > 0.5 ? '#ffaa22' : '#ff4400'
            : inst.params.palette.primary;
          p.maxLife = 0.4 + Math.random() * 0.25;
          p.customType = 'spark';
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 120, 0.95);
      if (inst.progress < 0.25) {
        const amp = (1 - inst.progress / 0.25) * 2.5;
        inst.shakeOffset = { x: (Math.random() - 0.5) * amp, y: (Math.random() - 0.5) * amp };
      } else {
        inst.shakeOffset = undefined;
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;

      // 1. Shockwave ring
      const ringRadius = p * Math.max(inst.width, inst.height) * 1.8;
      drawShockwave(ctx, cx, cy, ringRadius, 1 - p, '#ff8833', 3);

      // 2. Core flash at t < 0.25 (soft low-contrast)
      if (p < 0.25) {
        const flashAlpha = (1 - p / 0.25) * 0.35;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, inst.width * 1.2);
        grad.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 120, 30, 0.5)');
        grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, inst.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Sparks & smoke puffs
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'lightning',
    name: 'Thunder / Lightning',
    category: 'impact',
    words: ['thunder', 'lightning', 'electric', 'shock', 'spark', 'voltage'],
    intensity: 'normal',
    isBig: true,
    durationMs: 450,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      // Precompute bolt segments
      const segments: { x: number; y: number }[] = [];
      let curX = cx + (Math.random() - 0.5) * 40;
      let curY = cy - 70;
      segments.push({ x: curX, y: curY });
      while (curY < cy + 20) {
        curY += 12 + Math.random() * 8;
        curX += (Math.random() - 0.5) * 24;
        segments.push({ x: curX, y: curY });
      }
      inst.customState.segments = segments;

      // Crackle sparks
      for (let i = 0; i < 10; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 80;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 1.5 + Math.random() * 2;
          p.color = '#7df9ff';
          p.maxLife = 0.35;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 40, 0.94);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      const segments = inst.customState.segments as { x: number; y: number }[] | undefined;
      if (!segments || segments.length === 0) return;
      const p = inst.progress;
      const alpha = Math.max(0, 1 - p * 1.5);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#c8f8ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e1ff';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i++) {
        ctx.lineTo(segments[i].x, segments[i].y);
      }
      ctx.stroke();

      // Core white bolt
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'scream',
    name: 'Scream / Loud',
    category: 'impact',
    words: ['scream', 'loud', 'shout', 'roar'],
    intensity: 'normal',
    isBig: true,
    durationMs: 550,
    update: (inst) => {
      if (inst.progress < 0.3) {
        const amp = (1 - inst.progress / 0.3) * 1.8;
        inst.shakeOffset = { x: (Math.random() - 0.5) * amp, y: (Math.random() - 0.5) * amp };
      } else {
        inst.shakeOffset = undefined;
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const color = inst.params.palette.primary || '#ff4444';

      // 3 expanding radial shockwave rings
      for (let i = 0; i < 3; i++) {
        const ringP = Math.max(0, Math.min(1, p * 1.4 - i * 0.15));
        const r = ringP * Math.max(inst.width, inst.height) * 1.6;
        const alpha = (1 - ringP) * 0.8;
        drawShockwave(ctx, cx, cy, r, alpha, color, 2);
      }
    },
  },

  {
    id: 'crash',
    name: 'Crash / Smash',
    category: 'impact',
    words: ['crash', 'smash', 'hit', 'punch', 'knock', 'slam'],
    intensity: 'normal',
    isBig: false,
    durationMs: 480,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      for (let i = 0; i < 12; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = Math.random() * Math.PI * 2;
          const speed = 70 + Math.random() * 110;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 2 + Math.random() * 3;
          p.color = inst.params.palette.glow || '#f59e0b';
          p.maxLife = 0.4;
          p.customType = 'shard';
          p.rotation = Math.random() * Math.PI;
          p.vRot = (Math.random() - 0.5) * 10;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 160, 0.94);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      if (p < 0.4) {
        const starR = (p / 0.4) * (inst.width * 0.8);
        drawStarGlint(ctx, cx, cy, starR, p * 2, '#ffffff', (1 - p / 0.4) * 0.9);
      }
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'shatter',
    name: 'Break / Shatter',
    category: 'impact',
    words: ['break', 'broken', 'shatter', 'crack', 'crush'],
    intensity: 'normal',
    isBig: false,
    durationMs: 650,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      for (let i = 0; i < 14; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 90;
          p.x = cx + (Math.random() - 0.5) * inst.width * 0.8;
          p.y = cy + (Math.random() - 0.5) * inst.height * 0.8;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 20;
          p.size = 3 + Math.random() * 4;
          p.color = '#bae6fd';
          p.maxLife = 0.55;
          p.customType = 'shard';
          p.vRot = (Math.random() - 0.5) * 8;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 200, 0.96);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'heartbeat',
    name: 'Heartbeat / Pulse',
    category: 'impact',
    words: ['heartbeat', 'pulse', 'beat'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 12;
      const p = inst.progress;
      // Double pulse: at p=0.1 and p=0.4
      let pulseScale = 1;
      let alpha = 0.8;
      if (p < 0.25) {
        pulseScale = 1 + Math.sin((p / 0.25) * Math.PI) * 0.35;
      } else if (p >= 0.3 && p < 0.6) {
        pulseScale = 1 + Math.sin(((p - 0.3) / 0.3) * Math.PI) * 0.45;
      } else {
        alpha = Math.max(0, 1 - (p - 0.6) / 0.4);
      }
      const color = inst.params.palette.primary || '#ef4444';
      drawProceduralHeart(ctx, cx, cy, 14 * pulseScale, color, alpha);
    },
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
  },

  // ==========================================
  // 2. FIRE, HEAT & LIGHT (5 effects)
  // ==========================================
  {
    id: 'fire',
    name: 'Fire / Flames',
    category: 'fire',
    words: ['fire', 'flame', 'burn', 'blaze', 'inferno', 'hot', 'ember', 'ashes'],
    intensity: 'normal',
    isBig: true,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 14; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + Math.random() * inst.width;
          p.y = inst.y + inst.height;
          p.vx = (Math.random() - 0.5) * 20;
          p.vy = -40 - Math.random() * 60;
          p.size = 2 + Math.random() * 2.5;
          p.color = Math.random() > 0.4 ? '#ff6600' : '#ffcc00';
          p.maxLife = 0.6;
          p.customType = 'spark';
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, -20, 0.97);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      const p = inst.progress;
      const alpha = Math.max(0, 1 - p * 0.9);
      const baseY = inst.y + inst.height;

      // Stylized licking flames above the word
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = inst.params.naturalColors ? '#ff4500' : inst.params.palette.primary;
      ctx.beginPath();
      ctx.moveTo(inst.x - 4, baseY);
      for (let i = 0; i <= 6; i++) {
        const x = inst.x + (i / 6) * inst.width;
        const tipY = inst.y - 10 - Math.sin((p * 10 + i) * 1.5) * 12;
        ctx.quadraticCurveTo(x, tipY, x + inst.width / 12, baseY);
      }
      ctx.fill();
      ctx.restore();

      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'sun',
    name: 'Sun / Bright Glow',
    category: 'fire',
    words: ['sun', 'shine', 'bright', 'glow', 'light'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Ray burst
      const rays = 8;
      const maxR = inst.width * 1.2;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < rays; i++) {
        const angle = (Math.PI * 2 * i) / rays + p * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (inst.width * 0.3), cy + Math.sin(angle) * (inst.width * 0.3));
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
        ctx.stroke();
      }

      // Soft sun bloom
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, inst.width * 0.8);
      grad.addColorStop(0, 'rgba(255, 250, 180, 0.6)');
      grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, inst.width * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'star',
    name: 'Star / Sparkle',
    category: 'fire',
    words: ['star', 'sparkle', 'glitter', 'diamond', 'shiny'],
    intensity: 'normal',
    isBig: false,
    durationMs: 650,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const starCount = 4;
      for (let i = 0; i < starCount; i++) {
        const starP = (p + i * 0.25) % 1;
        const alpha = Math.sin(starP * Math.PI);
        const sx = inst.x + (i / (starCount - 1)) * inst.width;
        const sy = inst.y + Math.sin(i * 1.7) * 8;
        const r = 5 + Math.sin(starP * Math.PI) * 6;
        drawStarGlint(ctx, sx, sy, r, starP * Math.PI, '#ffffff', alpha);
      }
    },
  },

  {
    id: 'magic',
    name: 'Magic / Spell',
    category: 'fire',
    words: ['magic', 'spell', 'wish', 'charm', 'alchemy'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      for (let i = 0; i < 16; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = (Math.PI * 2 * i) / 16;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * 40;
          p.vy = Math.sin(angle) * 40;
          p.size = 2 + Math.random() * 2;
          p.color = i % 2 === 0 ? '#c084fc' : '#38bdf8';
          p.maxLife = 0.7;
          p.customData = angle;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      for (let i = 0; i < inst.particleIndices.length; i++) {
        const p = pool.get(inst.particleIndices[i]);
        if (!p.active) continue;
        p.customData = (p.customData || 0) + dt * 4;
        p.x += Math.cos(p.customData) * 35 * dt;
        p.y += Math.sin(p.customData) * 35 * dt - 10 * dt;
        p.life += dt;
        if (p.life >= p.maxLife) p.active = false;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'candle',
    name: 'Candle / Lantern',
    category: 'fire',
    words: ['candle', 'lantern'],
    intensity: 'normal',
    isBig: false,
    durationMs: 850,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 10;
      const p = inst.progress;
      const flicker = Math.sin(p * 24) * 2;
      const alpha = Math.sin(p * Math.PI) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Gentle flicker glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
      grad.addColorStop(0, 'rgba(255, 220, 120, 0.7)');
      grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();

      // Flame teardrop
      ctx.fillStyle = '#ffeedd';
      ctx.beginPath();
      ctx.ellipse(cx + flicker * 0.4, cy, 3, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  // ==========================================
  // 3. WATER, WEATHER & SKY (7 effects)
  // ==========================================
  {
    id: 'rain',
    name: 'Rain / Tears',
    category: 'water',
    words: ['rain', 'drizzle', 'storm', 'tears', 'cry', 'sorrow'],
    intensity: 'normal',
    isBig: false,
    durationMs: 750,
    init: (inst, pool) => {
      const count = inst.params.wordText.includes('tear') || inst.params.wordText.includes('cry') ? 4 : 12;
      for (let i = 0; i < count; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + (i / count) * inst.width + (Math.random() - 0.5) * 6;
          p.y = inst.y + inst.height;
          p.vx = (Math.random() - 0.5) * 10;
          p.vy = 60 + Math.random() * 80;
          p.size = 1.5 + Math.random() * 1.5;
          p.color = '#38bdf8';
          p.maxLife = 0.55;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 100, 0.98);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      for (let i = 0; i < inst.particleIndices.length; i++) {
        const p = pool.get(inst.particleIndices[i]);
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
        ctx.restore();
      }
    },
  },

  {
    id: 'ocean',
    name: 'Ocean / Waves',
    category: 'water',
    words: ['ocean', 'wave', 'sea', 'flood', 'drown', 'tide'],
    intensity: 'normal',
    isBig: true,
    durationMs: 850,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const baseY = inst.y + inst.height + 6;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Ripple ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, baseY, inst.width * (0.6 + p * 0.8), 8 + p * 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Wave swell sine curve
      ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
      ctx.beginPath();
      ctx.moveTo(inst.x - 20, baseY + 12);
      for (let x = inst.x - 20; x <= inst.x + inst.width + 20; x += 5) {
        const waveY = baseY + Math.sin((x / 15) + p * 6) * 4;
        ctx.lineTo(x, waveY);
      }
      ctx.lineTo(inst.x + inst.width + 20, baseY + 18);
      ctx.lineTo(inst.x - 20, baseY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'snow',
    name: 'Snow / Frost',
    category: 'water',
    words: ['snow', 'ice', 'cold', 'freeze', 'winter', 'frost'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    init: (inst, pool) => {
      for (let i = 0; i < 14; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + Math.random() * inst.width;
          p.y = inst.y - 10 + Math.random() * 10;
          p.vx = (Math.random() - 0.5) * 20;
          p.vy = 25 + Math.random() * 35;
          p.size = 2 + Math.random() * 2;
          p.color = '#e0f2fe';
          p.maxLife = 0.8;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      for (let i = 0; i < inst.particleIndices.length; i++) {
        const p = pool.get(inst.particleIndices[i]);
        if (!p.active) continue;
        p.x += Math.sin(p.life * 5) * 12 * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) p.active = false;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'wind',
    name: 'Wind / Leaves',
    category: 'water',
    words: ['wind', 'breeze', 'storm winds', 'fly', 'feather'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;

      // 3 horizontal wind streaks
      for (let i = 0; i < 3; i++) {
        const startX = inst.x - 30 + p * (inst.width + 60);
        const y = inst.y + (i / 2) * inst.height;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.bezierCurveTo(startX + 20, y - 5, startX + 40, y + 5, startX + 60, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  {
    id: 'cloud',
    name: 'Cloud / Fog / Smoke',
    category: 'water',
    words: ['cloud', 'smoke', 'fog', 'high', 'haze'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.35;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#94a3b8';
      // 4 soft expanding smoke circles
      for (let i = 0; i < 4; i++) {
        const offsetAngle = (i * Math.PI) / 2;
        const dist = p * 20;
        const ox = cx + Math.cos(offsetAngle) * dist;
        const oy = cy - p * 15 + Math.sin(offsetAngle) * (dist * 0.5);
        ctx.beginPath();
        ctx.arc(ox, oy, 14 + p * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },

  {
    id: 'moon',
    name: 'Moon / Night',
    category: 'water',
    words: ['moon', 'night', 'midnight', 'dark'],
    intensity: 'normal',
    isBig: false,
    durationMs: 950,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 16;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Crescent moon path
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, -Math.PI / 2, Math.PI / 2, false);
      ctx.arc(cx + 4, cy, 8, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'rainbow',
    name: 'Rainbow',
    category: 'water',
    words: ['rainbow'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.75;
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5;
      colors.forEach((col, idx) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, inst.width * 0.6 + idx * 3, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    },
  },

  // ==========================================
  // 4. EMOTION & RELATIONSHIPS (6 effects)
  // ==========================================
  {
    id: 'love',
    name: 'Love / Floating Hearts',
    category: 'emotion',
    words: ['love', 'heart', 'kiss', 'romance'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 5; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + (i / 4) * inst.width;
          p.y = inst.y + inst.height * 0.5;
          p.vx = (Math.random() - 0.5) * 15;
          p.vy = -35 - Math.random() * 30;
          p.size = 6 + Math.random() * 4;
          p.color = i % 2 === 0 ? '#f43f5e' : '#fb7185';
          p.maxLife = 0.75;
          p.customType = 'heart';
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      for (let i = 0; i < inst.particleIndices.length; i++) {
        const p = pool.get(inst.particleIndices[i]);
        if (!p.active) continue;
        p.x += Math.sin(p.life * 6) * 15 * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) p.active = false;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'heartbreak',
    name: 'Heartbreak',
    category: 'emotion',
    words: ['heartbreak', 'lonely', 'alone', 'miss', 'goodbye'],
    intensity: 'normal',
    isBig: false,
    durationMs: 750,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 12;
      const p = inst.progress;
      const crack = Math.max(0, (p - 0.2) / 0.8);
      const alpha = Math.max(0, 1 - p * 0.9);
      drawProceduralHeart(ctx, cx, cy, 16, '#94a3b8', alpha, crack);
    },
  },

  {
    id: 'angel',
    name: 'Angel / Halo',
    category: 'emotion',
    words: ['angel', 'halo', 'heaven'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 18;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'ghost',
    name: 'Ghost / Spirit',
    category: 'emotion',
    words: ['ghost', 'phantom', 'spirit', 'haunt'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 15 - inst.progress * 25;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.6;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;

      // Wispy ghostly dome
      ctx.beginPath();
      ctx.arc(cx, cy, 12, Math.PI, 0, false);
      ctx.bezierCurveTo(cx + 12, cy + 18, cx - 12, cy + 18, cx - 12, cy);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'dream',
    name: 'Dream / Sleep',
    category: 'emotion',
    words: ['dream', 'sleep', 'lullaby'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width;
      const cy = inst.y;
      const p = inst.progress;

      ctx.save();
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#a5b4fc';
      // 3 ascending "Z" characters
      for (let i = 0; i < 3; i++) {
        const zP = (p + i * 0.3) % 1;
        const alpha = Math.sin(zP * Math.PI) * 0.8;
        const x = cx + zP * 25 + i * 6;
        const y = cy - zP * 35 - i * 10;
        ctx.globalAlpha = alpha;
        ctx.fillText('Z', x, y);
      }
      ctx.restore();
    },
  },

  {
    id: 'confetti',
    name: 'Confetti / Celebrate',
    category: 'emotion',
    words: ['laugh', 'smile', 'joy', 'party', 'celebrate', 'confetti'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
      for (let i = 0; i < 18; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = Math.random() * Math.PI * 2;
          const speed = 60 + Math.random() * 100;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 50;
          p.size = 3 + Math.random() * 2;
          p.color = colors[i % colors.length];
          p.maxLife = 0.75;
          p.customType = 'confetti';
          p.vRot = (Math.random() - 0.5) * 12;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 140, 0.96);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  // ==========================================
  // 5. MOTION & OBJECTS (20 effects)
  // ==========================================
  {
    id: 'speed',
    name: 'Speed / Race',
    category: 'motion',
    words: ['run', 'fast', 'speed', 'race', 'drive', 'car', 'engine'],
    intensity: 'normal',
    isBig: false,
    durationMs: 500,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      // 4 horizontal speed streaks
      for (let i = 0; i < 4; i++) {
        const y = inst.y + (i / 3) * inst.height;
        const x1 = inst.x - 30 + p * 40;
        const x2 = inst.x + inst.width + 30 + p * 40;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  {
    id: 'fall',
    name: 'Fall / Drop',
    category: 'motion',
    words: ['fall', 'drop', 'down', 'sink'],
    intensity: 'normal',
    isBig: false,
    durationMs: 600,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.7;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const x = inst.x + (i / 2) * inst.width;
        ctx.beginPath();
        ctx.moveTo(x, inst.y);
        ctx.lineTo(x, inst.y + inst.height + 20 * p);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  {
    id: 'rise',
    name: 'Rise / Wings',
    category: 'motion',
    words: ['rise', 'up', 'climb', 'soar', 'wings', 'bird'],
    intensity: 'normal',
    isBig: false,
    durationMs: 750,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.85;
      const birdX = inst.x + p * (inst.width + 40);
      const birdY = inst.y - 10 - p * 30;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      // Procedural silhouette bird wings: \___/
      const flap = Math.sin(p * 20) * 5;
      ctx.beginPath();
      ctx.moveTo(birdX - 10, birdY - flap);
      ctx.quadraticCurveTo(birdX - 5, birdY, birdX, birdY + 2);
      ctx.quadraticCurveTo(birdX + 5, birdY, birdX + 10, birdY - flap);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'spin',
    name: 'Spin / Circle',
    category: 'motion',
    words: ['spin', 'circle', 'dizzy', 'round'],
    intensity: 'normal',
    isBig: false,
    durationMs: 600,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.8;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = inst.params.palette.primary || '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(inst.width, inst.height) * 0.75, p * Math.PI * 4, p * Math.PI * 4 + Math.PI);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'dance',
    name: 'Dance / Groove',
    category: 'motion',
    words: ['dance', 'groove', 'swing'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 12;
      const p = inst.progress;
      const bounce = Math.sin(p * 16) * 4;
      const alpha = Math.sin(p * Math.PI) * 0.8;
      drawMusicNote(ctx, cx - 10, cy + bounce, 12, '#ec4899', alpha, false);
      drawMusicNote(ctx, cx + 10, cy - bounce, 12, '#8b5cf6', alpha, true);
    },
  },

  {
    id: 'clock',
    name: 'Time / Clock',
    category: 'motion',
    words: ['time', 'clock', 'hour', 'forever'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const r = Math.max(inst.width, inst.height) * 0.75;
      const alpha = Math.sin(p * Math.PI) * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      // Clock ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Sweeping clock hand
      const angle = p * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * (r * 0.85), cy + Math.sin(angle) * (r * 0.85));
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'echo',
    name: 'Echo / Whisper',
    category: 'motion',
    words: ['echo', 'repeat', 'whisper'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const color = inst.params.palette.primary || '#64748b';
      // 3 expanding ghost boxes
      for (let i = 0; i < 3; i++) {
        const ringP = Math.max(0, Math.min(1, p * 1.3 - i * 0.15));
        const alpha = (1 - ringP) * 0.5;
        const pad = ringP * 24;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(inst.x - pad, inst.y - pad * 0.5, inst.width + pad * 2, inst.height + pad);
        ctx.restore();
      }
    },
  },

  {
    id: 'shadow',
    name: 'Shadow / Silhouette',
    category: 'motion',
    words: ['shadow', 'silhouette'],
    intensity: 'normal',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.45;
      const stretch = p * 20;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      ctx.filter = 'blur(4px)';
      ctx.fillRect(inst.x + stretch, inst.y + stretch * 0.5, inst.width, inst.height);
      ctx.restore();
    },
  },

  {
    id: 'coins',
    name: 'Money / Gold / Crown',
    category: 'motion',
    words: ['money', 'cash', 'gold', 'rich', 'coin', 'luxury', 'crown', 'king', 'queen'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 8; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + (i / 7) * inst.width;
          p.y = inst.y - 10;
          p.vx = (Math.random() - 0.5) * 20;
          p.vy = 40 + Math.random() * 50;
          p.size = 4 + Math.random() * 2;
          p.color = '#eab308';
          p.maxLife = 0.75;
          p.customType = 'coin';
          p.vRot = 6 + Math.random() * 6;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 100, 0.98);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'phone',
    name: 'Phone / Ring',
    category: 'motion',
    words: ['phone', 'call', 'ring'],
    intensity: 'normal',
    isBig: false,
    durationMs: 600,
    update: (inst) => {
      if (inst.progress < 0.6) {
        const shake = Math.sin(inst.progress * 30) * 2;
        inst.shakeOffset = { x: shake, y: 0 };
      } else {
        inst.shakeOffset = undefined;
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      // Sound vibration arcs on sides
      ctx.beginPath();
      ctx.arc(inst.x - 8, inst.y + inst.height / 2, 8, -Math.PI / 3, Math.PI / 3, true);
      ctx.arc(inst.x + inst.width + 8, inst.y + inst.height / 2, 8, (2 * Math.PI) / 3, (4 * Math.PI) / 3, true);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'glitch',
    name: 'Glitch / Static',
    category: 'motion',
    words: ['glitch', 'error', 'static', 'broken signal'],
    intensity: 'normal',
    isBig: false,
    durationMs: 400,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      if (p > 0.8) return;
      const offset = (Math.random() - 0.5) * 8;

      ctx.save();
      // RGB split horizontal slices
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(inst.x + offset, inst.y, inst.width, inst.height * 0.5);

      ctx.fillStyle = '#ec4899';
      ctx.fillRect(inst.x - offset, inst.y + inst.height * 0.5, inst.width, inst.height * 0.5);
      ctx.restore();
    },
  },

  {
    id: 'poison',
    name: 'Poison / Toxic',
    category: 'motion',
    words: ['poison', 'toxic', 'venom', 'potion'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 8; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + Math.random() * inst.width;
          p.y = inst.y + inst.height;
          p.vx = (Math.random() - 0.5) * 10;
          p.vy = -20 - Math.random() * 30;
          p.size = 2 + Math.random() * 3;
          p.color = '#22c55e';
          p.maxLife = 0.7;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, -10, 0.98);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'flower',
    name: 'Flower / Petals',
    category: 'motion',
    words: ['flower', 'bloom', 'garden', 'petals'],
    intensity: 'normal',
    isBig: false,
    durationMs: 850,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      for (let i = 0; i < 8; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = (Math.PI * 2 * i) / 8;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * 35;
          p.vy = Math.sin(angle) * 35 - 10;
          p.size = 3 + Math.random() * 2;
          p.color = '#f472b6';
          p.maxLife = 0.8;
          p.customType = 'shard';
          p.vRot = (Math.random() - 0.5) * 6;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 30, 0.97);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'butterfly',
    name: 'Butterfly / Bee / Firefly',
    category: 'motion',
    words: ['butterfly', 'bee', 'firefly'],
    intensity: 'normal',
    isBig: false,
    durationMs: 900,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 10;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.85;

      const flyX = cx + Math.sin(p * 8) * (inst.width * 0.6);
      const flyY = cy + Math.cos(p * 12) * 8;
      const wingFlap = Math.abs(Math.sin(p * 24));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fef08a';
      // Butterfly wings
      ctx.beginPath();
      ctx.ellipse(flyX - 4 * wingFlap, flyY, 5 * wingFlap, 4, -Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(flyX + 4 * wingFlap, flyY, 5 * wingFlap, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'chains',
    name: 'Chains / Cage',
    category: 'motion',
    words: ['chains', 'cage', 'trapped', 'prison'],
    intensity: 'normal',
    isBig: false,
    durationMs: 750,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.8;
      const links = 5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;

      const y = inst.y + inst.height * 0.5;
      for (let i = 0; i < links; i++) {
        const x = inst.x + (i / (links - 1)) * inst.width;
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 4, i % 2 === 0 ? 0 : Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  {
    id: 'mirror',
    name: 'Mirror / Glass Shine',
    category: 'motion',
    words: ['mirror', 'glass', 'reflection'],
    intensity: 'normal',
    isBig: false,
    durationMs: 500,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const sweepX = inst.x - 20 + p * (inst.width + 40);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sweepX, inst.y + inst.height + 4);
      ctx.lineTo(sweepX + 16, inst.y - 4);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'eye',
    name: 'Eye / Stare',
    category: 'motion',
    words: ['eye', 'watch', 'see', 'stare'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 14;
      const p = inst.progress;
      const blink = Math.sin(p * Math.PI);
      const alpha = blink * 0.85;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Almond eye curve
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.quadraticCurveTo(cx, cy - 8 * blink, cx + 12, cy);
      ctx.quadraticCurveTo(cx, cy + 8 * blink, cx - 12, cy);
      ctx.stroke();

      // Pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * blink, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'door',
    name: 'Door / Lock / Key',
    category: 'motion',
    words: ['door', 'key', 'open', 'lock'],
    intensity: 'normal',
    isBig: false,
    durationMs: 650,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      const p = inst.progress;
      const r = 10 + p * 15;
      const alpha = (1 - p) * 0.8;
      drawShockwave(ctx, cx, cy, r, alpha, '#f59e0b', 2);
    },
  },

  {
    id: 'drink',
    name: 'Drink / Champagne',
    category: 'motion',
    words: ['drink', 'wine', 'cheers', 'champagne'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 10; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + Math.random() * inst.width;
          p.y = inst.y + inst.height;
          p.vx = (Math.random() - 0.5) * 8;
          p.vy = -30 - Math.random() * 40;
          p.size = 1.5 + Math.random() * 2;
          p.color = '#fef08a';
          p.maxLife = 0.7;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, -15, 0.98);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  {
    id: 'music',
    name: 'Music / Melody',
    category: 'motion',
    words: ['music', 'melody', 'song', 'sing', 'guitar', 'drum'],
    intensity: 'normal',
    isBig: false,
    durationMs: 800,
    init: (inst, pool) => {
      for (let i = 0; i < 6; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          p.x = inst.x + (i / 5) * inst.width;
          p.y = inst.y;
          p.vx = (Math.random() - 0.5) * 15;
          p.vy = -25 - Math.random() * 35;
          p.size = 5 + Math.random() * 2;
          p.color = inst.params.palette.primary || '#ec4899';
          p.maxLife = 0.75;
          p.customType = 'note';
          p.customData = i % 2;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      for (let i = 0; i < inst.particleIndices.length; i++) {
        const p = pool.get(inst.particleIndices[i]);
        if (!p.active) continue;
        p.x += Math.sin(p.life * 5) * 12 * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) p.active = false;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },

  // ==========================================
  // 6. INTENSE EFFECTS (5 gated effects)
  // Gated by intenseEffectsEnabled: boolean
  // ==========================================
  {
    id: 'gun',
    name: 'Gun / Shot',
    category: 'intense',
    words: ['gun', 'shoot', 'shot', 'trigger', 'bullet', 'pistol'],
    intensity: 'intense',
    isBig: true,
    durationMs: 400,
    update: (inst) => {
      if (inst.progress < 0.2) {
        inst.shakeOffset = { x: -2, y: 0 };
      } else {
        inst.shakeOffset = undefined;
      }
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx) => {
      const p = inst.progress;
      if (p > 0.6) return;
      const rightX = inst.x + inst.width;
      const midY = inst.y + inst.height / 2;

      ctx.save();
      // Stylized conical muzzle flash (non-graphic, star-burst style)
      ctx.globalAlpha = (1 - p / 0.6) * 0.9;
      ctx.fillStyle = '#ffedd5';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rightX, midY);
      ctx.lineTo(rightX + 16, midY - 8);
      ctx.lineTo(rightX + 24, midY);
      ctx.lineTo(rightX + 16, midY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tracer streak line
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rightX + 20, midY);
      ctx.lineTo(rightX + 120 * (p / 0.6), midY);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'knife',
    name: 'Knife / Slash',
    category: 'intense',
    words: ['knife', 'dagger', 'blade', 'sword', 'cut', 'slash'],
    intensity: 'intense',
    isBig: false,
    durationMs: 380,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.max(0, 1 - p * 1.5);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#e2e8f0';
      ctx.shadowBlur = 8;

      // Fast diagonal slash through air across word
      ctx.beginPath();
      ctx.moveTo(inst.x - 10, inst.y - 10);
      ctx.lineTo(inst.x + inst.width + 10, inst.y + inst.height + 10);
      ctx.stroke();
      ctx.restore();
    },
  },

  {
    id: 'blood',
    name: 'Blood / Drip',
    category: 'intense',
    words: ['blood', 'bleed', 'wound'],
    intensity: 'intense',
    isBig: false,
    durationMs: 700,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.85;
      const dripY = inst.y + inst.height + p * 16;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dc2626';
      // Two stylized single drip beads
      ctx.beginPath();
      ctx.arc(inst.x + inst.width * 0.35, dripY, 2.5, 0, Math.PI * 2);
      ctx.arc(inst.x + inst.width * 0.7, dripY - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'skull',
    name: 'Death / Grave',
    category: 'intense',
    words: ['skull', 'grave', 'coffin', 'death', 'dead', 'die', 'kill'],
    intensity: 'intense',
    isBig: true,
    durationMs: 850,
    update: (inst) => inst.elapsedMs < inst.def.durationMs,
    draw: (inst, ctx) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y - 16;
      const p = inst.progress;
      const alpha = Math.sin(p * Math.PI) * 0.55;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#64748b';
      // Stylized gentle skull smoke silhouette
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 5, cy + 6, 10, 5);

      // Eye sockets
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - 3.5, cy, 2, 0, Math.PI * 2);
      ctx.arc(cx + 3.5, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },

  {
    id: 'war',
    name: 'War / Battle',
    category: 'intense',
    words: ['war', 'battle', 'fight'],
    intensity: 'intense',
    isBig: true,
    durationMs: 600,
    init: (inst, pool) => {
      const cx = inst.x + inst.width / 2;
      const cy = inst.y + inst.height / 2;
      for (let i = 0; i < 12; i++) {
        const idx = pool.acquire();
        if (idx !== -1) {
          const p = pool.get(idx);
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 70;
          p.x = cx + (Math.random() - 0.5) * inst.width;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - 15;
          p.size = 2 + Math.random() * 3;
          p.color = i % 2 === 0 ? '#ea580c' : '#78716c';
          p.maxLife = 0.55;
          inst.particleIndices.push(idx);
        }
      }
    },
    update: (inst, dt, pool) => {
      updateParticles(pool, inst.particleIndices, dt, 40, 0.95);
      return inst.elapsedMs < inst.def.durationMs;
    },
    draw: (inst, ctx, pool) => {
      drawParticles(ctx, pool, inst.particleIndices);
    },
  },
];

/**
 * Fast lookup indexes
 */
export const EFFECT_BY_ID: Map<string, WordEffectDef> = new Map(
  WORD_EFFECTS.map((e) => [e.id, e])
);

export const WORD_TO_EFFECT_ID: Map<string, string> = new Map();
for (const eff of WORD_EFFECTS) {
  for (const word of eff.words) {
    WORD_TO_EFFECT_ID.set(word.toLowerCase().trim(), eff.id);
  }
}

export function getEffectDef(id: string): WordEffectDef | undefined {
  return EFFECT_BY_ID.get(id);
}

export function getEffectIdForWord(word: string): string | undefined {
  if (!word) return undefined;
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  return WORD_TO_EFFECT_ID.get(clean);
}

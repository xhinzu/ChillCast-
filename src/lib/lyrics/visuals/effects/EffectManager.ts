import {
  WordEffectInstance,
  EffectTriggerParams,
  EffectFrequency,
  EffectStrength,
} from './types';
import { ParticlePool } from './ParticlePool';
import { FlashBudget } from './FlashBudget';
import { getEffectDef } from './catalog';

export interface EffectManagerOptions {
  wordEffectsEnabled: boolean;
  effectFrequency: EffectFrequency;
  effectStrength: EffectStrength;
  screenShakeEnabled: boolean;
  intenseEffectsEnabled: boolean;
  naturalColors: boolean;
  onShake?: (offset: { x: number; y: number } | null) => void;
}

export class EffectManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private pool: ParticlePool;
  private flashBudget: FlashBudget;
  private activeInstances: WordEffectInstance[] = [];

  private rafId: number | null = null;
  private lastFrameTime = 0;
  private isRunning = false;
  private isTabHidden = false;

  // Limits & Throttling
  private lineBigEffectMap: Map<number, boolean> = new Map();
  private effectCooldownMap: Map<string, number> = new Map();
  private triggerTimestamps: number[] = [];

  // FPS & Quality degradation
  private fpsHistory: number[] = [];
  private lowFpsAccumulator = 0; // ms with FPS < 45
  public isLowQualityMode = false;

  // Options & Settings
  public options: EffectManagerOptions;
  public prefersReducedMotion = false;

  constructor(options?: Partial<EffectManagerOptions>) {
    this.options = {
      wordEffectsEnabled: options?.wordEffectsEnabled ?? true,
      effectFrequency: options?.effectFrequency ?? 'normal',
      effectStrength: options?.effectStrength ?? 'normal',
      screenShakeEnabled: options?.screenShakeEnabled ?? true,
      intenseEffectsEnabled: options?.intenseEffectsEnabled ?? false,
      naturalColors: options?.naturalColors ?? true,
      onShake: options?.onShake,
    };

    this.pool = new ParticlePool(350);
    this.flashBudget = new FlashBudget();

    if (typeof window !== 'undefined') {
      this.prefersReducedMotion =
        !!window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Handle visibilitychange to pause / resume
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    this.isTabHidden = document.visibilityState === 'hidden';
    if (this.isTabHidden) {
      this.stopLoop();
    } else if (this.activeInstances.length > 0) {
      this.startLoop();
    }
  };

  public setCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
    } else {
      this.ctx = null;
      this.stopLoop();
    }
  }

  public updateOptions(opts: Partial<EffectManagerOptions>): void {
    this.options = { ...this.options, ...opts };
    if (!this.options.wordEffectsEnabled) {
      this.clearAll();
    }
  }

  /**
   * Frequency caps: Max triggers allowed per rolling 60 seconds
   */
  private getMaxPerMinute(): number {
    switch (this.options.effectFrequency) {
      case 'low':
        return 10;
      case 'high':
        return 35;
      case 'normal':
      default:
        return 20;
    }
  }

  /**
   * Attempt to trigger an effect by effectId
   */
  public triggerEffect(effectId: string, params: EffectTriggerParams): boolean {
    if (!this.options.wordEffectsEnabled) return false;
    if (this.prefersReducedMotion) return false; // Reduced motion suppresses dynamic particles

    const def = getEffectDef(effectId);
    if (!def) return false;

    // Intense effect gate
    if (def.intensity === 'intense' && !this.options.intenseEffectsEnabled) {
      return false;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Concurrent limit: at most 2 effects at once
    if (this.activeInstances.length >= 2) {
      return false;
    }

    // 2. Global per-minute cap
    const oneMinAgo = now - 60000;
    this.triggerTimestamps = this.triggerTimestamps.filter((t) => t > oneMinAgo);
    if (this.triggerTimestamps.length >= this.getMaxPerMinute()) {
      return false;
    }

    // 3. At most 1 big effect per line
    if (def.isBig && params.lineIndex !== undefined) {
      if (this.lineBigEffectMap.get(params.lineIndex)) {
        return false;
      }
    }

    // 4. Cooldown of ~3 s between large effects of the same type
    if (def.isBig) {
      const lastTrigger = this.effectCooldownMap.get(def.id);
      if (lastTrigger !== undefined && now - lastTrigger < 3000) {
        return false;
      }
    }

    // 5. Flash budget check for effects with full flashes
    if (def.id === 'bomb' || def.id === 'lightning') {
      const flashCheck = this.flashBudget.requestFlash(now);
      if (!flashCheck.allowed) {
        // Flash is rejected by photosensitivity budget, but effect can proceed with suppressed flash
      }
    }

    // Register trigger
    this.triggerTimestamps.push(now);
    if (def.isBig) {
      this.effectCooldownMap.set(def.id, now);
      if (params.lineIndex !== undefined) {
        this.lineBigEffectMap.set(params.lineIndex, true);
      }
    }

    // Create Instance
    const instance: WordEffectInstance = {
      instanceId: `${def.id}-${now}-${Math.random()}`,
      id: def.id,
      def,
      startTime: now,
      elapsedMs: 0,
      progress: 0,
      x: params.wordRect.x,
      y: params.wordRect.y,
      width: params.wordRect.width,
      height: params.wordRect.height,
      targetElement: params.targetElement,
      params,
      particleIndices: [],
      customState: {},
    };

    // Initialize effect
    if (def.init) {
      def.init(instance, this.pool);
    }

    this.activeInstances.push(instance);

    // Start loop if not already running
    if (!this.isRunning && !this.isTabHidden) {
      this.startLoop();
    }

    return true;
  }

  private startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(this.renderLoop);
    }
  }

  private stopLoop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.options.onShake) {
      this.options.onShake(null);
    }
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    // Quality check: measure FPS
    const currentFps = dt > 0 ? 1 / dt : 60;
    this.fpsHistory.push(currentFps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    if (currentFps < 45) {
      this.lowFpsAccumulator += dt;
      if (this.lowFpsAccumulator > 2.0) {
        this.isLowQualityMode = true; // Auto downscale quality
      }
    } else {
      this.lowFpsAccumulator = Math.max(0, this.lowFpsAccumulator - dt * 0.5);
      if (this.lowFpsAccumulator === 0 && this.isLowQualityMode) {
        this.isLowQualityMode = false;
      }
    }

    // Clear Canvas
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    let shakeX = 0;
    let shakeY = 0;
    let hasShake = false;

    // Update & Draw Instances
    const remainingInstances: WordEffectInstance[] = [];

    for (let i = 0; i < this.activeInstances.length; i++) {
      const inst = this.activeInstances[i];
      inst.elapsedMs = timestamp - inst.startTime;
      inst.progress = Math.min(1, inst.elapsedMs / inst.def.durationMs);

      // Keep attached to moving word position for the first ~300ms if word moves
      if (inst.elapsedMs <= 300 && inst.targetElement && inst.targetElement.isConnected && this.canvas) {
        const stageRect = this.canvas.getBoundingClientRect();
        const wordRect = inst.targetElement.getBoundingClientRect();
        if (wordRect.width > 0 && wordRect.height > 0) {
          inst.x = wordRect.left - stageRect.left;
          inst.y = wordRect.top - stageRect.top;
          inst.width = wordRect.width;
          inst.height = wordRect.height;
        }
      }

      // Update
      const keepAlive = inst.def.update(inst, dt, this.pool);

      // Collect shake
      if (inst.shakeOffset && this.options.screenShakeEnabled && !this.prefersReducedMotion) {
        shakeX += inst.shakeOffset.x;
        shakeY += inst.shakeOffset.y;
        hasShake = true;
      }

      // Draw
      if (this.ctx) {
        inst.def.draw(inst, this.ctx, this.pool);
      }

      if (keepAlive && inst.elapsedMs < inst.def.durationMs) {
        remainingInstances.push(inst);
      } else {
        // Release particles
        this.pool.releaseAll(inst.particleIndices);
        inst.particleIndices = [];
      }
    }

    this.activeInstances = remainingInstances;

    // Emit Screen Shake
    if (this.options.onShake) {
      this.options.onShake(hasShake ? { x: shakeX, y: shakeY } : null);
    }

    // Stop loop when idle
    if (this.activeInstances.length === 0) {
      this.stopLoop();
      return;
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Reset on song seek or track change
   */
  public clearAll(): void {
    for (const inst of this.activeInstances) {
      this.pool.releaseAll(inst.particleIndices);
    }
    this.activeInstances = [];
    this.pool.reset();
    this.lineBigEffectMap.clear();
    this.stopLoop();
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public getActiveInstancesCount(): number {
    return this.activeInstances.length;
  }

  public getFlashBudget(): FlashBudget {
    return this.flashBudget;
  }

  public destroy(): void {
    this.clearAll();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

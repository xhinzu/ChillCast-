import type { ParticlePool } from './ParticlePool';

export type EffectCategory =
  | 'impact'
  | 'fire'
  | 'water'
  | 'emotion'
  | 'motion'
  | 'intense';

export type EffectIntensity = 'subtle' | 'normal' | 'intense';
export type EffectStrength = 'subtle' | 'normal' | 'strong';
export type EffectFrequency = 'low' | 'normal' | 'high';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EffectPalette {
  primary: string;
  secondary: string;
  glow: string;
  isChroma: boolean;
}

export interface EffectTriggerParams {
  wordRect: ScreenRect;
  targetElement?: HTMLElement | SVGElement | null;
  palette: EffectPalette;
  naturalColors: boolean;
  intensity?: EffectIntensity;
  strength?: EffectStrength;
  seed: number;
  wordText: string;
  lineIndex?: number;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  scaleX: number;
  scaleY: number;
  customType?: string;
  customData?: number;
}

export interface WordEffectInstance {
  instanceId: string;
  id: string;
  def: WordEffectDef;
  startTime: number;
  elapsedMs: number;
  progress: number; // 0..1
  x: number;
  y: number;
  width: number;
  height: number;
  targetElement?: HTMLElement | SVGElement | null;
  params: EffectTriggerParams;
  particleIndices: number[];
  customState: Record<string, unknown>;
  shakeOffset?: { x: number; y: number };
}

export interface WordEffectDef {
  id: string;
  name: string;
  category: EffectCategory;
  words: string[];
  intensity: 'normal' | 'intense';
  isBig?: boolean;
  durationMs: number;
  init?: (instance: WordEffectInstance, pool: ParticlePool) => void;
  update: (instance: WordEffectInstance, dt: number, pool: ParticlePool) => boolean;
  draw: (instance: WordEffectInstance, ctx: CanvasRenderingContext2D, pool: ParticlePool) => void;
}

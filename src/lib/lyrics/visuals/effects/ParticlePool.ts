import { PooledParticle } from './types';

/**
 * High performance object pool for canvas particle effects.
 * Eliminates garbage collector stutter during 60 FPS requestAnimationFrame animation.
 */
export class ParticlePool {
  private particles: PooledParticle[];
  private readonly capacity: number;
  private freeIndices: number[];

  constructor(capacity = 350) {
    this.capacity = capacity;
    this.particles = new Array(capacity);
    this.freeIndices = new Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this.particles[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#ffffff',
        alpha: 1,
        life: 0,
        maxLife: 1,
        rotation: 0,
        vRot: 0,
        scaleX: 1,
        scaleY: 1,
      };
      this.freeIndices[i] = i;
    }
  }

  /**
   * Acquire a free particle from the pool.
   * Returns particle index, or -1 if capacity exceeded.
   */
  public acquire(): number {
    if (this.freeIndices.length === 0) {
      return -1;
    }
    const idx = this.freeIndices.pop()!;
    const p = this.particles[idx];
    p.active = true;
    p.x = 0;
    p.y = 0;
    p.vx = 0;
    p.vy = 0;
    p.size = 2;
    p.color = '#ffffff';
    p.alpha = 1;
    p.life = 0;
    p.maxLife = 1;
    p.rotation = 0;
    p.vRot = 0;
    p.scaleX = 1;
    p.scaleY = 1;
    p.customType = undefined;
    p.customData = undefined;
    return idx;
  }

  /**
   * Release a particle back to the pool by index.
   */
  public release(index: number): void {
    if (index >= 0 && index < this.capacity && this.particles[index].active) {
      this.particles[index].active = false;
      this.freeIndices.push(index);
    }
  }

  /**
   * Release an array of particle indices.
   */
  public releaseAll(indices: number[]): void {
    for (let i = 0; i < indices.length; i++) {
      this.release(indices[i]);
    }
  }

  /**
   * Get particle reference by index.
   */
  public get(index: number): PooledParticle {
    return this.particles[index];
  }

  /**
   * Number of currently active particles.
   */
  public getActiveCount(): number {
    return this.capacity - this.freeIndices.length;
  }

  /**
   * Reset all particles back to pool.
   */
  public reset(): void {
    this.freeIndices = [];
    for (let i = 0; i < this.capacity; i++) {
      this.particles[i].active = false;
      this.freeIndices.push(i);
    }
  }
}

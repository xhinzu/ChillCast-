/**
 * Central Photosensitivity & Safety Flash Budget.
 * Enforces W3C WCAG 2.1 flash thresholds & safety rules:
 * - Maximum 3 flashes in any rolling 1000ms window.
 * - Flashes must be short (under 150ms).
 * - Flashes must have low contrast (opacity capped at 0.35) with soft edges.
 */
export interface FlashRequestResult {
  allowed: boolean;
  maxOpacity: number;
  maxDurationMs: number;
}

export class FlashBudget {
  private flashTimestamps: number[] = [];
  public static readonly MAX_FLASHES_PER_SECOND = 3;
  public static readonly MAX_DURATION_MS = 140; // Safely under 150ms
  public static readonly MAX_CONTRAST_OPACITY = 0.35; // Low-contrast soft flash

  /**
   * Request permission for a screen or large core flash.
   * If the rolling 1-second budget is exceeded, permission is denied.
   */
  public requestFlash(now: number = (typeof performance !== 'undefined' ? performance.now() : Date.now())): FlashRequestResult {
    const windowStart = now - 1000;
    // Clean up timestamps older than 1 second
    this.flashTimestamps = this.flashTimestamps.filter((t) => t > windowStart);

    if (this.flashTimestamps.length >= FlashBudget.MAX_FLASHES_PER_SECOND) {
      return {
        allowed: false,
        maxOpacity: 0,
        maxDurationMs: 0,
      };
    }

    this.flashTimestamps.push(now);
    return {
      allowed: true,
      maxOpacity: FlashBudget.MAX_CONTRAST_OPACITY,
      maxDurationMs: FlashBudget.MAX_DURATION_MS,
    };
  }

  /**
   * Get count of flashes in the past 1 second window.
   */
  public getRecentFlashCount(now: number = (typeof performance !== 'undefined' ? performance.now() : Date.now())): number {
    const windowStart = now - 1000;
    return this.flashTimestamps.filter((t) => t > windowStart).length;
  }

  /**
   * Reset flash history.
   */
  public reset(): void {
    this.flashTimestamps = [];
  }
}

/**
 * Type declarations for PreMiD Presence runtime.
 * PreMiD injects the global Presence class into the presence execution sandbox.
 */

declare interface PresenceOptions {
  clientId: string;
}

declare interface PresenceButton {
  label: string;
  url: string;
}

declare interface PresenceData {
  details?: string;
  state?: string;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  buttons?: [PresenceButton, PresenceButton?];
  type?: number;
}

declare class Presence {
  constructor(options: PresenceOptions);
  on(event: 'UpdateData', callback: () => void | Promise<void>): void;
  setActivity(data: PresenceData): void;
  clearActivity(): void;
}

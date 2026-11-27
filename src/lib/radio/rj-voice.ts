import { isTauri } from '@/lib/desktop';
import { getDspEngine } from '@/lib/audio/dsp-engine';
import { RJ_PERSONAS, type RjPersonaSpec } from './stations';
import { getRandomCustomRjClipBlob } from './custom-clips';

export interface RjSpeakOptions {
  text: string;
  personaId: string;
  volume: number; // 0..1
  voiceOverride?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

let activeAudioSource: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let isSpeakingNow = false;

export function stopRjSpeech(): void {
  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch {}
    activeAudioSource = null;
  }
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.src = '';
    } catch {}
    activeHtmlAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  isSpeakingNow = false;
}

export function getIsRjSpeaking(): boolean {
  return isSpeakingNow;
}

export function listAvailableBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

function selectVoiceForPersona(
  persona: RjPersonaSpec,
  voices: SpeechSynthesisVoice[],
  overrideName?: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (overrideName) {
    const exact = voices.find((v) => v.name === overrideName);
    if (exact) return exact;
  }
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = enVoices.length > 0 ? enVoices : voices;
  const idx = RJ_PERSONAS.findIndex((p) => p.id === persona.id);
  return pool[Math.max(0, idx) % pool.length] || pool[0];
}

async function playWavBase64ThroughWebAudio(
  base64Wav: string,
  volume: number,
  onStart?: () => void,
  onEnd?: () => void
): Promise<boolean> {
  const ctx = getDspEngine().getAudioContext();
  if (!ctx) return false;
  try {
    const bin = atob(base64Wav);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));

    const src = ctx.createBufferSource();
    src.buffer = decoded;

    // Route through a mild radio-bandpass for authentic RJ voice timbre
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(180, ctx.currentTime);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    isSpeakingNow = true;
    activeAudioSource = src;
    onStart?.();
    src.onended = () => {
      activeAudioSource = null;
      isSpeakingNow = false;
      onEnd?.();
    };
    src.start();
    return true;
  } catch {
    return false;
  }
}

export async function speakRjLine(opts: RjSpeakOptions): Promise<'tauri-tts' | 'browser-tts' | 'skipped'> {
  if (isSpeakingNow || !opts.text.trim()) return 'skipped';
  const persona = RJ_PERSONAS.find((p) => p.id === opts.personaId) || RJ_PERSONAS[0];

  // 1. Tauri Windows SpeechSynthesizer spike (returns base64 WAV -> Web Audio filtered)
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const wavB64 = await invoke<string>('synthesize_rj_speech', {
        text: opts.text,
        rate: Math.round((persona.rate - 1) * 10),
        voiceHint: opts.voiceOverride || persona.voiceTraits[0] || '',
      });
      if (wavB64 && wavB64.length > 32) {
        const ok = await playWavBase64ThroughWebAudio(wavB64, opts.volume, opts.onStart, opts.onEnd);
        if (ok) return 'tauri-tts';
      }
    } catch {
      // Fall back to browser speechSynthesis
    }
  }

  // 2. Browser speechSynthesis fallback
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utter = new SpeechSynthesisUtterance(opts.text);
      const voices = listAvailableBrowserVoices();
      const chosen = selectVoiceForPersona(persona, voices, opts.voiceOverride);
      if (chosen) utter.voice = chosen;
      utter.rate = persona.rate;
      utter.pitch = persona.pitch;
      utter.volume = Math.max(0, Math.min(1, opts.volume));

      isSpeakingNow = true;
      opts.onStart?.();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        isSpeakingNow = false;
        opts.onEnd?.();
      };
      // Safety timeout in case browser speechSynthesis drops onend
      const safetyTimer = setTimeout(finish, 18000);
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);
      return 'browser-tts';
    } catch {
      isSpeakingNow = false;
      opts.onEnd?.();
    }
  }

  return 'skipped';
}

export async function playRandomCustomRjClip(params: {
  volume: number;
  onStart?: (clipName: string) => void;
  onEnd?: () => void;
}): Promise<boolean> {
  if (isSpeakingNow) return false;
  const picked = await getRandomCustomRjClipBlob();
  if (!picked) return false;

  const url = URL.createObjectURL(picked.blob);
  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, params.volume));
  activeHtmlAudio = audio;
  isSpeakingNow = true;
  params.onStart?.(picked.meta.name);

  return new Promise((resolve) => {
    const cleanup = () => {
      URL.revokeObjectURL(url);
      activeHtmlAudio = null;
      isSpeakingNow = false;
      params.onEnd?.();
    };
    audio.onended = () => {
      cleanup();
      resolve(true);
    };
    audio.onerror = () => {
      cleanup();
      resolve(false);
    };
    void audio.play().catch(() => {
      cleanup();
      resolve(false);
    });
  });
}


import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export function PlayIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M8 5.14v13.72a1 1 0 001.55.83l10.77-6.86a1 1 0 000-1.66L9.55 4.31A1 1 0 008 5.14z" />
    </svg>
  );
}

export function PauseIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M7 5a1 1 0 011 1v12a1 1 0 11-2 0V6a1 1 0 011-1zm10 0a1 1 0 011 1v12a1 1 0 11-2 0V6a1 1 0 011-1z" />
    </svg>
  );
}

export function StopIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function HeartIcon({
  className = 'w-4 h-4',
  filled = false,
  size,
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

export function MusicNoteIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function HeadphonesIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  );
}

export function SparklesIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2zm7 13l1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15z" />
    </svg>
  );
}

export function MoonIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function FolderIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export function SearchIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function TrashIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

export function MixerSlidersIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function VinylRecordIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

export function CoffeeIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

export function VolumeHighIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

export function VolumeLowIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

export function VolumeMuteIcon({ className = 'w-4 h-4', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

// -------------------------------------------------------------
// AMBIENT SOUNDSCAPE ICONS (All vector, no emojis)
// -------------------------------------------------------------

export function RainIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
      <line x1="8" y1="19" x2="8" y2="22" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="16" y1="19" x2="16" y2="22" />
    </svg>
  );
}

export function WindIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
    </svg>
  );
}

export function BirdsIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 4s-3 1-5 4-4 4-8 4c4 1 7 0 9-2 2-2 4-6 4-6z" />
      <path d="M16 4s1 4 4 6 4 1 4 1-3 0-5-2-3-5-3-5z" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function CricketsIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
      <circle cx="18" cy="5" r="1" fill="currentColor" />
      <circle cx="21" cy="9" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function ThunderIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function DrumsIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="7" rx="9" ry="3" />
      <path d="M3 7v10c0 1.66 4.03 3 9 3s9-1.34 9-3V7" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

export function GuitarIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 5l-2-2m-1 3l3-3m-6 6l5-5" />
      <circle cx="9" cy="15" r="6" />
      <circle cx="9" cy="15" r="2" />
      <line x1="14" y1="10" x2="20" y2="4" />
    </svg>
  );
}

export function ChatterIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 9h8m-8 4h5" />
    </svg>
  );
}

export function FireplaceIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0011 17c1.38 0 2.5-1.12 2.5-2.5 0-1.63-1.5-3-2.5-4.5-1 1.5-2.5 2.87-2.5 4.5z" />
      <path d="M12 2c5 4 8 8 8 13a8 8 0 11-16 0c0-5 3-9 8-13z" />
    </svg>
  );
}

export function WavesIcon({ className = 'w-5 h-5', size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 6c3-2 6-2 9 0s6 2 9 0 3-1 3-1M2 12c3-2 6-2 9 0s6 2 9 0 3-1 3-1M2 18c3-2 6-2 9 0s6 2 9 0 3-1 3-1" />
    </svg>
  );
}

/**
 * Universal Soundscape Icon Dispatcher
 */
export function AmbientSoundIcon({
  soundId,
  className = 'w-5 h-5',
}: {
  soundId: string;
  className?: string;
}) {
  switch (soundId) {
    case 'rain':
      return <RainIcon className={className} />;
    case 'wind':
      return <WindIcon className={className} />;
    case 'birds':
      return <BirdsIcon className={className} />;
    case 'crickets':
      return <CricketsIcon className={className} />;
    case 'thunder':
      return <ThunderIcon className={className} />;
    case 'lofi-drums':
      return <DrumsIcon className={className} />;
    case 'jazz-guitar':
      return <GuitarIcon className={className} />;
    case 'chatter':
      return <ChatterIcon className={className} />;
    case 'fireplace':
      return <FireplaceIcon className={className} />;
    case 'waves':
      return <WavesIcon className={className} />;
    default:
      return <MusicNoteIcon className={className} />;
  }
}

/**
 * Universal Playlist Icon Dispatcher
 */
export function PlaylistCoverIcon({
  iconKey,
  icon,
  isLiked,
  className,
  size = 'md',
}: {
  iconKey?: string;
  icon?: string;
  isLiked?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | string;
}) {
  const resolvedKey = isLiked ? 'heart' : (iconKey || icon);
  const sizeClass = className || (size === 'sm' ? 'w-5 h-5 text-zinc-300' : size === 'lg' ? 'w-10 h-10 text-white' : 'w-6 h-6 text-zinc-300');

  switch (resolvedKey) {
    case 'heart':
    case '💙':
      return <HeartIcon filled className={sizeClass} />;
    case 'headphones':
    case '🎧':
      return <HeadphonesIcon className={sizeClass} />;
    case 'sparkles':
    case '✨':
      return <SparklesIcon className={sizeClass} />;
    case 'moon':
    case '🌙':
      return <MoonIcon className={sizeClass} />;
    case 'folder':
    case '📁':
      return <FolderIcon className={sizeClass} />;
    default:
      return <MusicNoteIcon className={sizeClass} />;
  }
}

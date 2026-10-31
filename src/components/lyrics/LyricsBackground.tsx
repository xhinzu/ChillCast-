'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { BackgroundType } from '@/lib/lyrics/settings';
import { loadCustomMedia } from '@/lib/lyrics/mediaStorage';

interface LyricsBackgroundProps {
  type: BackgroundType;
  dim?: number; // 0 to 100
  blur?: number; // 0 to 60 (px)
  brightness?: number; // 0 to 200
  parallaxStrength?: number; // 0 to 100
  artworkUrl?: string;
  highlightColor?: string;
  secondaryColor?: string;
  parallaxX?: number;
  parallaxY?: number;
  isTabHidden?: boolean;
}

export default function LyricsBackground({
  type = 'black',
  dim = 30,
  blur = 20,
  brightness = 100,
  parallaxStrength = 25,
  artworkUrl,
  highlightColor = '#ef4444',
  secondaryColor = '#f59e0b',
  parallaxX = 0,
  parallaxY = 0,
  isTabHidden = false,
}: LyricsBackgroundProps) {
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load custom image/video from IndexedDB if requested
  useEffect(() => {
    if (type !== 'custom_image' && type !== 'custom_video') return;

    let activeUrl: string | null = null;
    loadCustomMedia()
      .then((record) => {
        if (record && record.blob) {
          activeUrl = URL.createObjectURL(record.blob);
          setCustomMediaUrl(activeUrl);
          setIsVideo(record.type.startsWith('video/'));
        }
      })
      .catch(() => {
        setCustomMediaUrl(null);
      });

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [type]);

  // Pause video if tab is hidden
  useEffect(() => {
    if (videoRef.current) {
      if (isTabHidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isTabHidden]);

  // Parallax translation
  const pFactor = (parallaxStrength / 100) * 1.5;
  const transX = parallaxX * pFactor;
  const transY = parallaxY * pFactor;

  // Pure black default
  if (type === 'black' || (type === 'cover' && imageError)) {
    return (
      <div className="absolute inset-0 bg-black pointer-events-none -z-20" />
    );
  }

  const dimOpacity = Math.max(0, Math.min(1.0, dim / 100));
  const brightnessFilter = `brightness(${(brightness / 100).toFixed(2)})`;
  const blurFilter = type === 'blurred' || blur > 0 ? `blur(${blur}px)` : 'none';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20 bg-black">
      {/* Background Media Container with Parallax and Crossfade */}
      <div
        className="absolute -inset-12 transition-transform duration-100 ease-out transform-gpu scale-105"
        style={{
          transform: `translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0px)`,
          filter: `${brightnessFilter} ${blurFilter}`,
        }}
      >
        {/* Cover Art / Blurred Cover Art */}
        {(type === 'cover' || type === 'blurred') && artworkUrl && (
          <Image
            src={artworkUrl}
            alt="Track Cover Artwork"
            fill
            sizes="100vw"
            onError={() => setImageError(true)}
            className="object-cover object-center transition-opacity duration-700"
            priority
          />
        )}

        {/* Palette Gradient */}
        {type === 'gradient' && (
          <div
            className="w-full h-full transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, ${highlightColor}44 0%, ${secondaryColor}22 55%, #000000 100%)`,
            }}
          />
        )}

        {/* Custom Video Loop */}
        {type === 'custom_video' && customMediaUrl && isVideo && (
          <video
            ref={videoRef}
            src={customMediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center"
          />
        )}

        {/* Custom Image */}
        {(type === 'custom_image' || (type === 'custom_video' && !isVideo)) && customMediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customMediaUrl}
            alt="Custom Background"
            className="w-full h-full object-cover object-center"
          />
        )}
      </div>

      {/* Dim Overlay */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
        style={{ opacity: dimOpacity }}
      />

      {/* Automatic subtle dark scrim behind text to guarantee high contrast */}
      <div
        className="absolute inset-0 bg-radial from-black/20 via-black/55 to-black/85 pointer-events-none"
        style={{ opacity: Math.max(0.4, dimOpacity) }}
      />
    </div>
  );
}

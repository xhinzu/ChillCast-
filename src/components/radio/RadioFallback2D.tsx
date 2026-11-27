'use client';

import React, { useRef } from 'react';
import { useRadio } from '@/context/RadioContext';
import { usePlayback } from '@/context/PlaybackContext';
import { useSettings } from '@/lib/settings/useSettings';
import { AM_MAX, AM_MIN, FM_MAX, FM_MIN } from '@/lib/radio/stations';
import { frequencyToDialAngle } from '@/lib/radio/reception';

const SKIN_COLORS: Record<string, { body: string; trim: string; accent: string }> = {
  white: { body: '#eceef2', trim: '#18181b', accent: '#ef4444' },
  black: { body: '#1c1d22', trim: '#09090b', accent: '#f59e0b' },
  wood: { body: '#7c4a2d', trim: '#29170d', accent: '#f59e0b' },
  teal: { body: '#1f6f78', trim: '#0f2f34', accent: '#fb7185' },
};

export default function RadioFallback2D() {
  const {
    powerOn,
    band,
    frequency,
    activeStation,
    presets,
    antennaLength,
    antennaAngleDeg,
    togglePower,
    setBand,
    tuneToFrequency,
    scanNext,
    savePreset,
    recallPreset,
    setAntenna,
  } = useRadio();
  const playback = usePlayback();
  const { settings } = useSettings();

  const skin =
    settings.radio.radioColor === 'custom'
      ? { body: settings.radio.customRadioColor || '#e5e7eb', trim: '#18181b', accent: '#ef4444' }
      : SKIN_COLORS[settings.radio.radioColor] || SKIN_COLORS.white;

  const min = band === 'FM' ? FM_MIN : AM_MIN;
  const max = band === 'FM' ? FM_MAX : AM_MAX;
  const t = Math.max(0, Math.min(1, (frequency - min) / (max - min)));
  const needleX = 248 + t * 224;

  const tuningAngleDeg = (frequencyToDialAngle(frequency, band) * 180) / Math.PI;
  const volAngleDeg = -135 + playback.volume * 270;

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="w-full min-h-[380px] sm:min-h-[440px] rounded-2xl bg-black border border-white/10 flex items-center justify-center p-4 select-none">
      <svg
        viewBox="0 0 640 380"
        className="w-full max-w-[620px] h-auto drop-shadow-[0_24px_40px_rgba(0,0,0,0.9)]"
        role="img"
        aria-label={`Interactive 2D Radio tuned to ${band} ${frequency}`}
      >
        {/* Telescopic Antenna */}
        <g
          transform={`translate(520, 74) rotate(${antennaAngleDeg})`}
          className="cursor-pointer"
          onClick={() => setAntenna(antennaLength > 0.6 ? 0.35 : 1, antennaAngleDeg === 0 ? 15 : 0)}
        >
          <rect x="-5" y="-6" width="10" height="12" rx="3" fill="#52525b" />
          <line
            x1="0"
            y1="-6"
            x2="0"
            y2={-20 - antennaLength * 62}
            stroke="#d4d4d8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="0" cy={-20 - antennaLength * 62} r="4.5" fill="#e4e4e7" />
        </g>

        {/* Top Carry Handle */}
        <path
          d="M 150 76 L 150 48 Q 150 36 164 36 L 476 36 Q 490 36 490 48 L 490 76"
          fill="none"
          stroke="#27272a"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Feet */}
        <rect x="112" y="328" width="34" height="12" rx="4" fill="#18181b" />
        <rect x="494" y="328" width="34" height="12" rx="4" fill="#18181b" />

        {/* Radio Main Body */}
        <rect x="80" y="74" width="480" height="256" rx="22" fill={skin.body} stroke={skin.trim} strokeWidth="4" />
        <rect x="92" y="86" width="456" height="232" rx="16" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />

        {/* Speaker Grille (Left) */}
        <rect x="108" y="106" width="124" height="192" rx="12" fill="#18181b" />
        {Array.from({ length: 11 }).map((_, row) =>
          Array.from({ length: 7 }).map((__, col) => (
            <circle
              key={`${row}-${col}`}
              cx={122 + col * 16}
              cy={122 + row * 16}
              r="3.1"
              fill="#09090b"
            />
          ))
        )}

        {/* Black Dial Window (Top Right) */}
        <rect x="248" y="106" width="280" height="84" rx="10" fill="#09090d" stroke="#27272a" strokeWidth="2" />
        {/* Scale markings */}
        {Array.from({ length: 21 }).map((_, i) => {
          const x = 262 + i * 12.6;
          return (
            <line
              key={i}
              x1={x}
              y1={i % 5 === 0 ? 124 : 130}
              x2={x}
              y2={140}
              stroke="#71717a"
              strokeWidth={i % 5 === 0 ? 1.8 : 1}
            />
          );
        })}
        <text x="262" y="120" fill="#a1a1aa" fontSize="10" fontFamily="monospace">
          {band === 'FM' ? '88   92   96   100   104   108 MHz' : '530  800  1100  1400  1700 kHz'}
        </text>
        <text x="262" y="176" fill="#e4e4e7" fontSize="12" fontFamily="monospace" fontWeight="bold">
          {band} {band === 'FM' ? frequency.toFixed(1) : frequency} · {activeStation ? activeStation.name : 'STATIC'}
        </text>

        {/* Moving Needle */}
        <line x1={needleX} y1="112" x2={needleX} y2="184" stroke={skin.accent} strokeWidth="2.5" />

        {/* Power LED + Power Button */}
        <circle cx="264" cy="214" r="5" fill={powerOn ? '#22c55e' : '#3f3f46'} />
        <g onClick={togglePower} className="cursor-pointer">
          <rect x="280" y="202" width="54" height="24" rx="6" fill="#18181b" />
          <text x="307" y="218" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
            {powerOn ? 'ON' : 'OFF'}
          </text>
        </g>

        {/* FM/AM Band Switch */}
        <g onClick={() => setBand(band === 'FM' ? 'AM' : 'FM')} className="cursor-pointer">
          <rect x="344" y="202" width="56" height="24" rx="6" fill="#27272a" />
          <text x="372" y="218" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="bold">
            {band}
          </text>
        </g>

        {/* Preset Buttons P1-P6 */}
        {[1, 2, 3, 4, 5, 6].map((slot, idx) => {
          const has = presets.some((p) => p.slot === slot);
          const bx = 248 + idx * 47;
          return (
            <g
              key={slot}
              className="cursor-pointer"
              onPointerDown={() => {
                longPressTimerRef.current = setTimeout(() => {
                  savePreset(slot);
                  longPressTimerRef.current = null;
                }, 480);
              }}
              onPointerUp={() => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                  if (has) recallPreset(slot);
                  else savePreset(slot);
                }
              }}
            >
              <rect
                x={bx}
                y="240"
                width="41"
                height="20"
                rx="4"
                fill={has ? '#27272a' : '#18181b'}
                stroke={has ? skin.accent : '#3f3f46'}
                strokeWidth="1.2"
              />
              <text x={bx + 20.5} y="254" textAnchor="middle" fill="#f4f4f5" fontSize="9.5" fontFamily="monospace">
                P{slot}
              </text>
            </g>
          );
        })}

        {/* Volume Knob */}
        <g
          transform="translate(310, 294)"
          className="cursor-pointer"
          onWheel={(e) => {
            e.preventDefault();
            playback.setVolume(Math.max(0, Math.min(1, playback.volume + (e.deltaY < 0 ? 0.05 : -0.05))));
          }}
          onClick={() => playback.setVolume(playback.volume > 0.1 ? 0 : 0.8)}
        >
          <circle cx="0" cy="0" r="24" fill="#18181b" stroke="#52525b" strokeWidth="2" />
          <g transform={`rotate(${volAngleDeg})`}>
            <line x1="0" y1="0" x2="0" y2="-18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <text x="0" y="34" textAnchor="middle" fill="#71717a" fontSize="9" fontWeight="bold">
            VOLUME
          </text>
        </g>

        {/* Tuning Knob */}
        <g
          transform="translate(462, 294)"
          className="cursor-pointer"
          onDoubleClick={() => scanNext(1)}
          onWheel={(e) => {
            e.preventDefault();
            const step = band === 'FM' ? (e.shiftKey ? 0.1 : 0.3) : (e.shiftKey ? 10 : 30);
            tuneToFrequency(frequency + (e.deltaY < 0 ? step : -step), { snap: !e.shiftKey });
          }}
        >
          <circle cx="0" cy="0" r="28" fill="#18181b" stroke="#52525b" strokeWidth="2" />
          <g transform={`rotate(${tuningAngleDeg})`}>
            <line x1="0" y1="0" x2="0" y2="-21" stroke={skin.accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <text x="0" y="36" textAnchor="middle" fill="#71717a" fontSize="9" fontWeight="bold">
            TUNING
          </text>
        </g>
      </svg>
    </div>
  );
}


'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import { useRadio } from '@/context/RadioContext';
import { usePlayback } from '@/context/PlaybackContext';
import { useSettings } from '@/lib/settings/useSettings';
import { getDspEngine } from '@/lib/audio/dsp-engine';
import { AM_MAX, AM_MIN, FM_MAX, FM_MIN } from '@/lib/radio/stations';
import { frequencyToDialAngle } from '@/lib/radio/reception';
import RadioFallback2D from './RadioFallback2D';

const SKIN_MAP: Record<string, { body: string; bezel: string; trim: string }> = {
  white: { body: '#e8eaef', bezel: '#141519', trim: '#111216' },
  black: { body: '#1c1e24', bezel: '#0d0e12', trim: '#2b2e38' },
  wood: { body: '#7c4a2d', bezel: '#1f140e', trim: '#2b1a10' },
  teal: { body: '#1f6f78', bezel: '#102d32', trim: '#0d2327' },
};

function createDialCanvasTexture(band: 'FM' | 'AM', frequency: number, stationName: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep backlit receiver glass
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#070b12');
    grad.addColorStop(1, '#0c1320');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // FM scale row
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('FM', 42, 62);
    const fmLabels = ['88', '92', '96', '100', '104', '108'];
    fmLabels.forEach((lbl, i) => {
      const x = 110 + (i / (fmLabels.length - 1)) * 840;
      ctx.fillStyle = band === 'FM' ? '#f8fafc' : '#64748b';
      ctx.fillText(lbl, x - 18, 62);
    });

    // Tick marks
    const ticks = 50;
    for (let i = 0; i <= ticks; i++) {
      const x = 110 + (i / ticks) * 840;
      const major = i % 5 === 0;
      ctx.strokeStyle = major ? '#e2e8f0' : '#475569';
      ctx.lineWidth = major ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x, major ? 82 : 94);
      ctx.lineTo(x, 122);
      ctx.stroke();
    }

    // AM scale row
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('AM', 42, 166);
    const amLabels = ['530', '800', '1100', '1400', '1700'];
    amLabels.forEach((lbl, i) => {
      const x = 110 + (i / (amLabels.length - 1)) * 840;
      ctx.fillStyle = band === 'AM' ? '#38bdf8' : '#475569';
      ctx.fillText(lbl, x - 24, 166);
    });

    // Divider line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(42, 196);
    ctx.lineTo(982, 196);
    ctx.stroke();

    // Live readout
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px monospace';
    const freqStr = band === 'FM' ? `${frequency.toFixed(1)} MHz` : `${frequency} kHz`;
    ctx.fillText(`${band} ${freqStr}`, 44, 266);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(stationName.slice(0, 24), 430, 264);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createGrilleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#14151a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle speaker cone shadow behind holes
    const rad = ctx.createRadialGradient(256, 256, 24, 256, 256, 230);
    rad.addColorStop(0, 'rgba(60, 65, 78, 0.35)');
    rad.addColorStop(0.55, 'rgba(20, 22, 28, 0.25)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 512, 512);

    // Dense perforated speaker holes
    for (let y = 18; y < 500; y += 20) {
      for (let x = 18; x < 500; x += 20) {
        ctx.fillStyle = '#040406';
        ctx.beginPath();
        ctx.arc(x, y, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createKnobRingTexture(label: string, ticks = 11): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const cx = 128;
    const cy = 128;
    for (let i = 0; i < ticks; i++) {
      const a = ((-135 + (i / (ticks - 1)) * 270) - 90) * (Math.PI / 180);
      const r1 = 92;
      const r2 = i % 2 === 0 ? 108 : 102;
      ctx.strokeStyle = i === 0 ? '#ef4444' : '#cbd5e1';
      ctx.lineWidth = i % 2 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 238);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function RadioMesh({
  hoveredLabel,
  setHoveredLabel,
  reducedMotion,
  cameraTilt,
}: {
  hoveredLabel: string | null;
  setHoveredLabel: (l: string | null) => void;
  reducedMotion: boolean;
  cameraTilt: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const {
    powerOn,
    band,
    frequency,
    activeStation,
    presets,
    antennaLength,
    antennaAngleDeg,
    togglePower,
    setPowerOn,
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
      ? { body: settings.radio.customRadioColor || '#e8eaef', bezel: '#141519', trim: '#111216' }
      : SKIN_MAP[settings.radio.radioColor] || SKIN_MAP.white;

  const groupRef = useRef<THREE.Group>(null);
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragModeRef = useRef<'none' | 'tuning' | 'volume' | 'antenna'>('none');
  const dragStartRef = useRef<{ x: number; y: number; val: number; lastAngle: number }>({
    x: 0,
    y: 0,
    val: 0,
    lastAngle: 0,
  });

  const dialTexture = useMemo(
    () => createDialCanvasTexture(band, frequency, activeStation ? activeStation.name : 'STATIC'),
    [band, frequency, activeStation]
  );
  const grilleTexture = useMemo(() => createGrilleTexture(), []);
  const tuningRingTex = useMemo(() => createKnobRingTexture('TUNING', 13), []);
  const volumeRingTex = useMemo(() => createKnobRingTexture('VOLUME', 11), []);

  useEffect(() => () => dialTexture.dispose(), [dialTexture]);
  useEffect(() => () => grilleTexture.dispose(), [grilleTexture]);
  useEffect(() => () => tuningRingTex.dispose(), [tuningRingTex]);
  useEffect(() => () => volumeRingTex.dispose(), [volumeRingTex]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragModeRef.current === 'none') return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = dragStartRef.current.y - e.clientY;
      const delta = dx + dy * 0.65;

      if (dragModeRef.current === 'tuning') {
        const scale = band === 'FM' ? (e.shiftKey ? 0.015 : 0.055) : (e.shiftKey ? 2 : 8);
        tuneToFrequency(dragStartRef.current.val + delta * scale, { snap: false });
      } else if (dragModeRef.current === 'volume') {
        const nextVol = Math.max(0, Math.min(1, dragStartRef.current.val + delta * 0.0045));
        if (nextVol <= 0.01 && powerOn) setPowerOn(false);
        else if (nextVol > 0.03 && !powerOn) setPowerOn(true);
        playback.setVolume(nextVol);
      } else if (dragModeRef.current === 'antenna') {
        const nextLen = Math.max(0.25, Math.min(1, dragStartRef.current.val + dy * 0.004));
        const nextAng = Math.max(-42, Math.min(42, dx * 0.35));
        setAntenna(nextLen, nextAng);
      }
    };
    const onUp = () => {
      if (dragModeRef.current === 'tuning') {
        tuneToFrequency(frequency, { snap: true, silent: true });
      }
      dragModeRef.current = 'none';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [band, frequency, powerOn, playback, setAntenna, setPowerOn, tuneToFrequency]);

  const min = band === 'FM' ? FM_MIN : AM_MIN;
  const max = band === 'FM' ? FM_MAX : AM_MAX;
  const t = Math.max(0, Math.min(1, (frequency - min) / (max - min)));
  // Dial window is at x = +0.78, width = 2.04 -> span from -0.02 to +1.58
  const needleX = -0.02 + t * 1.6;

  // Clockwise rotation around Z axis (negative Z in Three.js)
  const tuningAngleZ = -frequencyToDialAngle(frequency, band);
  const volumeAngleZ = -((-135 + playback.volume * 270) * Math.PI) / 180;

  useFrame((state) => {
    if (!groupRef.current) return;
    const tElapsed = state.clock.getElapsedTime();
    groupRef.current.position.y = reducedMotion ? 0 : Math.sin(tElapsed * 1.1) * 0.015;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, cameraTilt.current.x, 0.14);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, cameraTilt.current.y, 0.14);

    if (ledMatRef.current) {
      const peak = powerOn ? getDspEngine().getOutputPeak() : 0;
      ledMatRef.current.emissiveIntensity = powerOn ? 1.3 + peak * 1.8 : 0.05;
    }
  });

  // Front face of main body is at z = +0.525
  const frontZ = 0.526;

  return (
    <group ref={groupRef}>
      {/* Carry Handle (top brackets + bar) */}
      <mesh position={[-1.48, 1.18, -0.05]}>
        <boxGeometry args={[0.14, 0.34, 0.14]} />
        <meshStandardMaterial color="#1f2026" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[1.48, 1.18, -0.05]}>
        <boxGeometry args={[0.14, 0.34, 0.14]} />
        <meshStandardMaterial color="#1f2026" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0, 1.35, -0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.065, 0.065, 3.06, 20]} />
        <meshStandardMaterial color="#27272d" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Four Rubber Feet */}
      {[-1.72, 1.72].map((fx) =>
        [-0.36, 0.36].map((fz) => (
          <mesh key={`${fx}-${fz}`} position={[fx, -1.14, fz]}>
            <cylinderGeometry args={[0.14, 0.16, 0.08, 16]} />
            <meshStandardMaterial color="#141418" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Main Body (depth 1.05 -> front face at z = +0.525) */}
      <RoundedBox args={[4.3, 2.24, 1.05]} radius={0.14} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={skin.body} roughness={0.35} metalness={0.08} />
      </RoundedBox>

      {/* Subtle Dark Trim Inset Ring on front face */}
      <mesh position={[0, 0, frontZ]}>
        <ringGeometry args={[0, 0, 1]} />
      </mesh>
      <RoundedBox args={[4.06, 2.02, 0.02]} radius={0.11} smoothness={3} position={[0, 0, frontZ]}>
        <meshStandardMaterial color={skin.trim} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[3.98, 1.94, 0.022]} radius={0.1} smoothness={3} position={[0, 0, frontZ + 0.004]}>
        <meshStandardMaterial color={skin.body} roughness={0.35} metalness={0.08} />
      </RoundedBox>

      {/* LEFT: Speaker Grille Frame + Perforated Mesh */}
      <RoundedBox args={[1.64, 1.72, 0.04]} radius={0.08} smoothness={3} position={[-1.08, 0, frontZ + 0.015]}>
        <meshStandardMaterial color={skin.bezel} roughness={0.55} />
      </RoundedBox>
      <mesh position={[-1.08, 0, frontZ + 0.037]}>
        <planeGeometry args={[1.52, 1.6]} />
        <meshStandardMaterial map={grilleTexture} roughness={0.7} />
      </mesh>

      {/* RIGHT TOP: Dial Window Bezel + Glass Scale + Moving Needle */}
      <RoundedBox args={[2.16, 0.72, 0.04]} radius={0.06} smoothness={3} position={[0.78, 0.5, frontZ + 0.015]}>
        <meshStandardMaterial color="#0b0c10" roughness={0.35} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0.78, 0.5, frontZ + 0.037]}>
        <planeGeometry args={[2.04, 0.62]} />
        <meshStandardMaterial map={dialTexture} roughness={0.18} metalness={0.08} />
      </mesh>
      <mesh position={[needleX, 0.54, frontZ + 0.044]}>
        <boxGeometry args={[0.024, 0.44, 0.014]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.1} />
      </mesh>

      {/* RIGHT MIDDLE: Power LED, Power Button, FM/AM Switch */}
      <mesh position={[-0.08, 0.02, frontZ + 0.025]}>
        <sphereGeometry args={[0.042, 16, 16]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color={powerOn ? '#22c55e' : '#3f3f46'}
          emissive={powerOn ? '#22c55e' : '#000000'}
          emissiveIntensity={powerOn ? 1.5 : 0}
        />
      </mesh>

      <mesh
        position={[0.24, 0.02, frontZ + 0.03]}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
          setHoveredLabel('Power');
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setHoveredLabel(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          togglePower();
        }}
      >
        <boxGeometry args={[0.36, 0.15, 0.05]} />
        <meshStandardMaterial color={powerOn ? '#16a34a' : '#27272a'} roughness={0.35} />
      </mesh>

      <mesh
        position={[0.72, 0.02, frontZ + 0.03]}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
          setHoveredLabel(`Band (${band})`);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setHoveredLabel(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setBand(band === 'FM' ? 'AM' : 'FM');
        }}
      >
        <boxGeometry args={[0.38, 0.15, 0.05]} />
        <meshStandardMaterial color="#27272a" roughness={0.4} />
      </mesh>

      {/* 6 Preset Buttons */}
      {[1, 2, 3, 4, 5, 6].map((slot, i) => {
        const has = presets.some((p) => p.slot === slot);
        return (
          <mesh
            key={slot}
            position={[-0.06 + i * 0.34, -0.22, frontZ + 0.028]}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
              setHoveredLabel(`Preset ${slot}`);
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
              setHoveredLabel(null);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              longPressRef.current = setTimeout(() => {
                savePreset(slot);
                longPressRef.current = null;
              }, 480);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (longPressRef.current) {
                clearTimeout(longPressRef.current);
                longPressRef.current = null;
                if (has) recallPreset(slot);
                else savePreset(slot);
              }
            }}
          >
            <boxGeometry args={[0.26, 0.12, 0.045]} />
            <meshStandardMaterial color={has ? '#ef4444' : '#27272a'} roughness={0.45} />
          </mesh>
        );
      })}

      {/* VOLUME KNOB (Ring markings + True Z-Axis Circular Rotation) */}
      <mesh position={[0.25, -0.62, frontZ + 0.018]}>
        <planeGeometry args={[0.56, 0.56]} />
        <meshBasicMaterial map={volumeRingTex} transparent />
      </mesh>
      <group position={[0.25, -0.62, frontZ + 0.06]} rotation={[0, 0, volumeAngleZ]}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onPointerOver={() => {
            document.body.style.cursor = 'grab';
            setHoveredLabel('Volume');
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
            setHoveredLabel(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragModeRef.current = 'volume';
            dragStartRef.current = { x: e.clientX, y: e.clientY, val: playback.volume, lastAngle: 0 };
          }}
          onWheel={(e) => {
            e.stopPropagation();
            const next = Math.max(0, Math.min(1, playback.volume + (e.deltaY < 0 ? 0.05 : -0.05)));
            if (next <= 0.01 && powerOn) setPowerOn(false);
            else if (next > 0.03 && !powerOn) setPowerOn(true);
            playback.setVolume(next);
          }}
        >
          <cylinderGeometry args={[0.19, 0.21, 0.14, 32]} />
          <meshStandardMaterial color="#1f2128" roughness={0.35} metalness={0.55} />
        </mesh>
        {/* Chrome outer lip */}
        <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.215, 0.215, 0.02, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.25} metalness={0.85} />
        </mesh>
        {/* Pointer tick on face */}
        <mesh position={[0, 0.1, 0.075]}>
          <boxGeometry args={[0.026, 0.14, 0.018]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* TUNING KNOB (Ring markings + True Z-Axis Circular Rotation) */}
      <mesh position={[1.3, -0.62, frontZ + 0.018]}>
        <planeGeometry args={[0.66, 0.66]} />
        <meshBasicMaterial map={tuningRingTex} transparent />
      </mesh>
      <group position={[1.3, -0.62, frontZ + 0.07]} rotation={[0, 0, tuningAngleZ]}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onPointerOver={() => {
            document.body.style.cursor = 'grab';
            setHoveredLabel('Tuning');
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
            setHoveredLabel(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragModeRef.current = 'tuning';
            dragStartRef.current = { x: e.clientX, y: e.clientY, val: frequency, lastAngle: 0 };
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            scanNext(1);
          }}
          onWheel={(e) => {
            e.stopPropagation();
            const step = band === 'FM' ? (e.shiftKey ? 0.1 : 0.3) : (e.shiftKey ? 10 : 30);
            tuneToFrequency(frequency + (e.deltaY < 0 ? step : -step), { snap: !e.shiftKey });
          }}
        >
          <cylinderGeometry args={[0.23, 0.25, 0.16, 36]} />
          <meshStandardMaterial color="#1f2128" roughness={0.32} metalness={0.55} />
        </mesh>
        {/* Amber/Gold outer ring */}
        <mesh position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.258, 0.258, 0.022, 36]} />
          <meshStandardMaterial color="#eab308" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Pointer tick on face */}
        <mesh position={[0, 0.12, 0.085]}>
          <boxGeometry args={[0.028, 0.16, 0.018]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Telescopic 5-Segment Antenna */}
      <group
        position={[1.76, 1.12, -0.25]}
        rotation={[0, 0, (-antennaAngleDeg * Math.PI) / 180]}
        onPointerOver={() => {
          document.body.style.cursor = 'grab';
          setHoveredLabel('Antenna');
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setHoveredLabel(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragModeRef.current = 'antenna';
          dragStartRef.current = { x: e.clientX, y: e.clientY, val: antennaLength, lastAngle: 0 };
        }}
      >
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 14]} />
          <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.25} />
        </mesh>
        {[0, 1, 2, 3, 4].map((seg) => {
          const segH = 0.26 * antennaLength;
          const yPos = 0.1 + seg * segH * 0.92 + segH / 2;
          const r = 0.032 - seg * 0.0045;
          return (
            <mesh key={seg} position={[0, yPos, 0]}>
              <cylinderGeometry args={[r * 0.9, r, segH, 12]} />
              <meshStandardMaterial color="#e4e4e7" metalness={0.92} roughness={0.18} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.1 + 5 * 0.26 * antennaLength * 0.92, 0]}>
          <sphereGeometry args={[0.038, 12, 12]} />
          <meshStandardMaterial color="#f4f4f5" metalness={0.92} roughness={0.18} />
        </mesh>
      </group>

      {hoveredLabel && <group name="hover-active" />}
    </group>
  );
}

export default function RadioStage3D() {
  const { settings } = useSettings();
  const { isScanning, powerOn } = useRadio();
  const playback = usePlayback();

  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cameraTilt = useRef({ x: 0, y: 0 });
  const bgDragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    const onVis = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq) {
      setReducedMotion(mq.matches);
      const onChange = () => setReducedMotion(mq.matches);
      mq.addEventListener?.('change', onChange);
      return () => {
        document.removeEventListener('visibilitychange', onVis);
        mq.removeEventListener?.('change', onChange);
      };
    }
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const quality = settings.radio.quality3d;
  if (!webglSupported || quality === 'low' || quality === '2d') {
    return <RadioFallback2D />;
  }

  const shouldAnimate =
    !isTabHidden && (isScanning || (!reducedMotion && (powerOn || playback.isPlaying)));

  return (
    <div
      className="relative w-full h-[380px] sm:h-[440px] rounded-2xl bg-black border border-white/10 overflow-hidden select-none"
      onPointerDown={(e) => {
        bgDragRef.current = { active: true, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!bgDragRef.current.active) return;
        const dx = (e.clientX - bgDragRef.current.x) * 0.0025;
        const dy = (e.clientY - bgDragRef.current.y) * 0.0018;
        cameraTilt.current = {
          x: Math.max(-0.35, Math.min(0.35, dx)),
          y: Math.max(-0.18, Math.min(0.18, dy)),
        };
      }}
      onPointerUp={() => {
        bgDragRef.current.active = false;
        cameraTilt.current = { x: 0, y: 0 };
      }}
      onPointerLeave={() => {
        bgDragRef.current.active = false;
        cameraTilt.current = { x: 0, y: 0 };
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={shouldAnimate ? 'always' : 'demand'}
        camera={{ position: [0, 0.3, 5.7], fov: 38 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 6]} intensity={1.45} castShadow />
        <directionalLight position={[-5, 2, -4]} intensity={0.7} color="#93c5fd" />
        <pointLight position={[0, -0.5, 4.5]} intensity={0.45} color="#fef3c7" />

        <RadioMesh
          hoveredLabel={hoveredLabel}
          setHoveredLabel={setHoveredLabel}
          reducedMotion={reducedMotion}
          cameraTilt={cameraTilt}
        />

        <ContactShadows position={[0, -1.24, 0]} opacity={0.45} scale={9} blur={2.4} far={3} />
      </Canvas>

      {hoveredLabel && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-white/15 text-[11px] font-semibold text-white shadow">
          {hoveredLabel}
        </div>
      )}
    </div>
  );
}

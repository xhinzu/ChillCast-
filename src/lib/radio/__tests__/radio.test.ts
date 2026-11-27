import assert from 'node:assert';
import {
  FM_MIN_SPACING,
  RJ_PERSONAS,
  STATION_TEMPLATES,
  generateStations,
} from '../stations';
import {
  computeStationSignal,
  dialAngleToFrequency,
  evaluateReception,
  findMagneticSnapStation,
  frequencyToDialAngle,
} from '../reception';
import {
  computeFallbackJoinOffset,
  computeLiveBroadcast,
} from '../schedule';
import {
  getTotalScriptCount,
  normalizeForSpeech,
  pickRjScript,
} from '../rj-scripts';
import { planRjTrigger } from '../rj-planner';
import { DEFAULT_SETTINGS, getSettings } from '../../settings/settings-store';
import type { TrackInfo } from '../../../types/playback';

console.log('--- RUNNING RADIO MODE UNIT TEST SUITE ---');

// 1. Station generation
assert.ok(STATION_TEMPLATES.length >= 30, 'At least 30 station templates required');
assert.strictEqual(RJ_PERSONAS.length, 8, '8 RJ personas required');

const fm1 = generateStations(12345, 'FM');
const fm2 = generateStations(12345, 'FM');
const fm3 = generateStations(99999, 'FM');
assert.deepStrictEqual(fm1, fm2, 'Station generation must be deterministic for same seed');
assert.notDeepStrictEqual(fm1.map((s) => s.frequency), fm3.map((s) => s.frequency), 'Re-scan seed changes stations');
assert.ok(fm1.length >= 14 && fm1.length <= 18, `FM station count ${fm1.length} in [14, 18]`);
assert.ok(fm1.some((s) => s.name === 'Your Library FM' && s.isPersonal === 'library'), 'Your Library FM must exist');
assert.ok(fm1.some((s) => s.name === 'Discover FM' && s.isPersonal === 'discover'), 'Discover FM must exist');

for (let i = 1; i < fm1.length; i++) {
  assert.ok(
    fm1[i].frequency - fm1[i - 1].frequency >= FM_MIN_SPACING - 1e-6,
    `Minimum 0.8 MHz spacing violated between ${fm1[i - 1].frequency} and ${fm1[i].frequency}`
  );
}

// 2. Reception & dial angle mapping
const centerSig = computeStationSignal(91.3, 91.3, 'FM');
const edgeSig = computeStationSignal(91.7, 91.3, 'FM');
assert.strictEqual(centerSig, 1);
assert.ok(edgeSig < 0.1, 'Signal decays sharply off-center');

const recCenter = evaluateReception(fm1[0].frequency, fm1, 'FM');
assert.strictEqual(recCenter.locked, true);
assert.ok(recCenter.musicGain > 0.9 && recCenter.staticGain < 0.05);

const snap = findMagneticSnapStation(fm1[0].frequency + 0.04, fm1, 'FM');
assert.strictEqual(snap?.id, fm1[0].id, 'Magnetic snap within +/-0.05 MHz');

const angle = frequencyToDialAngle(98.4, 'FM');
assert.strictEqual(dialAngleToFrequency(angle, 'FM'), 98.4, 'Dial angle round-trip');

// 3. Live schedule
const pool: TrackInfo[] = Array.from({ length: 24 }, (_, i) => ({
  id: `trk-${i}`,
  title: `Track ${i}`,
  artist: `Artist ${i}`,
  duration: 180 + (i % 5) * 15,
  source: 'youtube',
}));
const t0 = 1_700_000_000_000;
const b1 = computeLiveBroadcast(1001, t0, pool)!;
const bSame = computeLiveBroadcast(1001, t0 + 15_000, pool)!;
const bLater = computeLiveBroadcast(1001, t0 + 300_000, pool)!;
assert.strictEqual(b1.track.id, bSame.track.id, 'Tune-away and back within song returns to same song');
assert.ok(bSame.offsetSec >= b1.offsetSec + 14, 'Offset advances in real time');
assert.notStrictEqual(b1.track.id, bLater.track.id, 'Coming back later plays a different song');

const fallbackOff = computeFallbackJoinOffset(1001, 200);
assert.ok(fallbackOff >= 30 && fallbackOff <= 140, 'Fallback offset in 15%-70% range');

// 4. RJ scripts & normalization
assert.ok(getTotalScriptCount() >= 150, `Script bank must have >=150 lines, got ${getTotalScriptCount()}`);
const cleaned = normalizeForSpeech('Song Title (Official Music Video) [Lyrics]', 'Artist Name - Topic');
assert.strictEqual(cleaned.song, 'Song Title');
assert.strictEqual(cleaned.artist, 'Artist Name');

const used: string[] = [];
const s1 = pickRjScript({
  category: 'ident',
  context: { station: fm1[0], timeStr: '8:30 PM' },
  recentLines: used,
  seed: 1,
});
used.push(s1.template);
const s2 = pickRjScript({
  category: 'ident',
  context: { station: fm1[0], timeStr: '8:30 PM' },
  recentLines: used,
  seed: 1,
});
assert.notStrictEqual(s1.template, s2.template, 'Script picker must not repeat recent lines');

// 5. RJ planner
assert.strictEqual(
  planRjTrigger({
    frequency: 'off',
    elapsedSec: 5,
    durationSec: 200,
    lastSpokeAtMs: 0,
    nowMs: 100_000,
    customClipsEnabled: false,
    hasCustomClips: false,
    roll: 0,
    clipRoll: 1,
  }).shouldSpeak,
  false
);
assert.strictEqual(
  planRjTrigger({
    frequency: 'often',
    elapsedSec: 194,
    durationSec: 200,
    lastSpokeAtMs: 0,
    nowMs: 100_000,
    customClipsEnabled: true,
    hasCustomClips: true,
    roll: 0.2,
    clipRoll: 0.1,
  }).useCustomClip,
  true
);

// 6. Radio settings defaults & persistence
assert.strictEqual(DEFAULT_SETTINGS.radio.defaultBand, 'FM');
assert.strictEqual(DEFAULT_SETTINGS.radio.vintageSoundEnabled, true);
assert.strictEqual(typeof getSettings().radio.stationSeed, 'number');

console.log('✓ All Radio Mode unit tests passed!');


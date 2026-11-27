export type RadioBand = 'FM' | 'AM';

export interface StationTemplate {
  id: string;
  tag: string;
  language: string;
  queries: string[];
  bandPreference?: 'FM' | 'AM' | 'both';
}

export interface RjPersonaSpec {
  id: string;
  name: string;
  tone: string;
  rate: number;
  pitch: number;
  voiceTraits: string[];
}

export interface RadioStation {
  id: string;
  frequency: number;
  band: RadioBand;
  name: string;
  tag: string;
  language: string;
  queries: string[];
  rjPersonaId: string;
  jingleSeed: number;
  isPersonal?: 'library' | 'discover';
}

export const FM_MIN = 88.0;
export const FM_MAX = 108.0;
export const FM_STEP = 0.1;
export const FM_MIN_SPACING = 0.8;

export const AM_MIN = 530;
export const AM_MAX = 1700;
export const AM_STEP = 10;
export const AM_MIN_SPACING = 40;

export const RJ_PERSONAS: RjPersonaSpec[] = [
  { id: 'mara', name: 'Mara Vance', tone: 'Warm late-night storyteller', rate: 0.96, pitch: 1.02, voiceTraits: ['female', 'warm', 'natural'] },
  { id: 'julian', name: 'Julian Cross', tone: 'Crisp morning host', rate: 1.04, pitch: 0.96, voiceTraits: ['male', 'clear', 'energetic'] },
  { id: 'kael', name: 'Kael Mercer', tone: 'Laid-back indie curator', rate: 0.95, pitch: 0.92, voiceTraits: ['male', 'calm', 'deep'] },
  { id: 'sora', name: 'Sora Takahashi', tone: 'Bright pop & anime host', rate: 1.06, pitch: 1.1, voiceTraits: ['female', 'bright', 'upbeat'] },
  { id: 'priya', name: 'Priya Nair', tone: 'Melodic evening host', rate: 0.98, pitch: 1.04, voiceTraits: ['female', 'smooth', 'expressive'] },
  { id: 'mateo', name: 'Mateo Rivera', tone: 'Rhythmic groove selector', rate: 1.03, pitch: 0.98, voiceTraits: ['male', 'smooth', 'rhythmic'] },
  { id: 'nadia', name: 'Nadia Sterling', tone: 'Classic vinyl archivist', rate: 0.93, pitch: 0.95, voiceTraits: ['female', 'composed', 'classic'] },
  { id: 'dex', name: 'Dex Holloway', tone: 'High-energy synthwave & club host', rate: 1.08, pitch: 1.0, voiceTraits: ['male', 'punchy', 'fast'] },
];

export const STATION_TEMPLATES: StationTemplate[] = [
  { id: 'lofi', tag: 'Lo-fi', language: 'Instrumental', queries: ['lofi hip hop beats', 'chillhop study beats', 'lofi chill music'], bandPreference: 'FM' },
  { id: 'chill', tag: 'Chill', language: 'English', queries: ['chill indie vibes music', 'downtempo chillout tracks', 'mellow electronic chill'], bandPreference: 'FM' },
  { id: 'pop', tag: 'Pop Hits', language: 'English', queries: ['top pop hits official audio', 'modern pop songs audio', 'chart pop music'], bandPreference: 'FM' },
  { id: '80s', tag: '80s Throwbacks', language: 'English', queries: ['80s classic pop hits audio', '80s new wave synth classics', '1980s greatest hits'], bandPreference: 'both' },
  { id: '90s', tag: '90s Throwbacks', language: 'English', queries: ['90s classic hits audio', '90s r&b pop throwback', '90s alternative rock hits'], bandPreference: 'both' },
  { id: '2000s', tag: '2000s Throwbacks', language: 'English', queries: ['2000s pop hits audio', '2000s r&b classics', '2000s rock hits'], bandPreference: 'both' },
  { id: 'hiphop', tag: 'Hip-Hop', language: 'English', queries: ['hip hop rap hits audio', 'melodic rap songs', 'classic hip hop tracks'], bandPreference: 'FM' },
  { id: 'rnb', tag: 'R&B', language: 'English', queries: ['smooth r&b songs audio', 'modern r&b soul tracks', 'late night r&b'], bandPreference: 'FM' },
  { id: 'rock', tag: 'Rock', language: 'English', queries: ['classic rock hits audio', 'modern rock anthems', 'hard rock tracks'], bandPreference: 'both' },
  { id: 'indie', tag: 'Indie', language: 'English', queries: ['indie pop songs audio', 'indie rock favorites', 'bedroom pop tracks'], bandPreference: 'FM' },
  { id: 'alt', tag: 'Alternative', language: 'English', queries: ['alternative rock tracks', 'alt pop songs audio', '90s alt rock'], bandPreference: 'both' },
  { id: 'jazz', tag: 'Jazz', language: 'Instrumental', queries: ['smooth jazz saxophone', 'cafe jazz trio', 'classic modal jazz'], bandPreference: 'both' },
  { id: 'soul', tag: 'Soul', language: 'English', queries: ['classic soul motown audio', 'neo soul tracks', 'warm soul vocals'], bandPreference: 'both' },
  { id: 'electronic', tag: 'Electronic / House', language: 'English', queries: ['deep house music tracks', 'melodic electronic dance', 'uk garage house audio'], bandPreference: 'FM' },
  { id: 'anime', tag: 'Anime / J-Pop', language: 'Japanese', queries: ['anime opening theme songs', 'jpop hits official audio', 'japanese city pop'], bandPreference: 'FM' },
  { id: 'kpop', tag: 'K-Pop', language: 'Korean', queries: ['kpop hits official audio', 'korean r&b indie', 'kpop dance tracks'], bandPreference: 'FM' },
  { id: 'hindi', tag: 'Hindi', language: 'Hindi', queries: ['hindi bollywood romantic songs', 'hindi indie acoustic', 'latest hindi songs audio'], bandPreference: 'both' },
  { id: 'malayalam', tag: 'Malayalam', language: 'Malayalam', queries: ['malayalam melody songs', 'malayalam indie music', 'malayalam hit songs audio'], bandPreference: 'both' },
  { id: 'tamil', tag: 'Tamil', language: 'Tamil', queries: ['tamil hit songs audio', 'tamil melody tracks', 'ar rahman anirudh tamil songs'], bandPreference: 'both' },
  { id: 'telugu', tag: 'Telugu', language: 'Telugu', queries: ['telugu melody songs audio', 'telugu hit songs', 'tollywood latest songs'], bandPreference: 'both' },
  { id: 'punjabi', tag: 'Punjabi', language: 'Punjabi', queries: ['punjabi pop hits audio', 'punjabi chill tracks', 'punjabi bhangra hits'], bandPreference: 'FM' },
  { id: 'acoustic', tag: 'Acoustic', language: 'English', queries: ['acoustic guitar vocal songs', 'unplugged acoustic covers', 'folk acoustic indie'], bandPreference: 'both' },
  { id: 'piano', tag: 'Piano', language: 'Instrumental', queries: ['solo piano neoclassical', 'peaceful piano music', 'cinematic piano pieces'], bandPreference: 'both' },
  { id: 'study', tag: 'Study / Focus', language: 'Instrumental', queries: ['deep focus ambient music', 'study instrumental beats', 'concentration music'], bandPreference: 'FM' },
  { id: 'synthwave', tag: 'Night Drive / Synthwave', language: 'Instrumental', queries: ['synthwave retrowave night drive', 'outrun electronic music', 'darksynth instrumental'], bandPreference: 'FM' },
  { id: 'workout', tag: 'Workout', language: 'English', queries: ['workout hype music audio', 'high energy gym tracks', 'running upbeat hits'], bandPreference: 'FM' },
  { id: 'sad', tag: 'Sad Hours', language: 'English', queries: ['sad indie songs audio', 'melancholy acoustic ballads', 'late night emotional songs'], bandPreference: 'both' },
  { id: 'party', tag: 'Party', language: 'English', queries: ['dance club party hits', 'upbeat pop dance tracks', 'friday night party music'], bandPreference: 'FM' },
  { id: 'latin', tag: 'Latin', language: 'Spanish', queries: ['latin pop reggaeton hits', 'spanish acoustic pop', 'latin urban music audio'], bandPreference: 'FM' },
  { id: 'afrobeats', tag: 'Afrobeats', language: 'English', queries: ['afrobeats hits official audio', 'amapiano afrofusion tracks', 'afropop chill vibes'], bandPreference: 'FM' },
  { id: 'ambient', tag: 'Ambient', language: 'Instrumental', queries: ['ambient soundscapes sleep', 'space ambient music', 'ethereal drone ambient'], bandPreference: 'AM' },
  { id: 'instrumental', tag: 'Instrumental', language: 'Instrumental', queries: ['instrumental post rock', 'guitar instrumental chill', 'cinematic instrumental'], bandPreference: 'both' },
];

const NAME_ADJECTIVES = [
  'Moonlit', 'Velvet', 'Amber', 'Neon', 'Silver', 'Copper', 'Midnight', 'Cobalt',
  'Static', 'Crimson', 'Glass', 'Horizon', 'Echo', 'Solstice', 'Golden', 'Drift',
  'Starlight', 'Cedar', 'Harbor', 'Prism', 'Twilight', 'Cloud',
];

const NAME_NOUNS = [
  'Static', 'Pulse', 'Wave', 'Signal', 'Beacon', 'Harbor', 'Circuit', 'Drift',
  'Echo', 'Dial', 'Compass', 'Frequency', 'Channel', 'Lounge', 'Relay', 'Vault',
  'Aurora', 'Mirage', 'Transit', 'Lantern',
];

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateStations(seed: number, band: RadioBand = 'FM'): RadioStation[] {
  const rng = mulberry32(seed + (band === 'AM' ? 9973 : 101));
  const stations: RadioStation[] = [];

  // Fixed personal stations
  const libFreq = band === 'FM' ? 88.5 : 550;
  const discFreq = band === 'FM' ? 107.5 : 1650;
  stations.push({
    id: `personal-library-${band.toLowerCase()}`,
    frequency: libFreq,
    band,
    name: band === 'FM' ? 'Your Library FM' : 'Your Library AM',
    tag: 'Personal',
    language: 'Mixed',
    queries: ['liked songs mix'],
    rjPersonaId: 'mara',
    jingleSeed: 1001,
    isPersonal: 'library',
  });
  stations.push({
    id: `personal-discover-${band.toLowerCase()}`,
    frequency: discFreq,
    band,
    name: band === 'FM' ? 'Discover FM' : 'Discover AM',
    tag: 'Discovery',
    language: 'Mixed',
    queries: ['new music discovery'],
    rjPersonaId: 'julian',
    jingleSeed: 2002,
    isPersonal: 'discover',
  });

  const minFreq = band === 'FM' ? FM_MIN : AM_MIN;
  const maxFreq = band === 'FM' ? FM_MAX : AM_MAX;
  const step = band === 'FM' ? FM_STEP : AM_STEP;
  const minSpacing = band === 'FM' ? FM_MIN_SPACING : AM_MIN_SPACING;

  const targetCount = 14 + Math.floor(rng() * 3); // 14-16 generated + 2 personal = 16-18 total
  const candidates = [...STATION_TEMPLATES].filter(
    (t) => !t.bandPreference || t.bandPreference === 'both' || t.bandPreference === band
  );
  // Shuffle templates deterministically
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const usedNames = new Set<string>(stations.map((s) => s.name));
  const usedFreqs: number[] = stations.map((s) => s.frequency);

  let attempts = 0;
  let tmplIdx = 0;
  while (stations.length < targetCount + 2 && attempts < 800 && tmplIdx < candidates.length) {
    attempts++;
    const stepsCount = Math.floor((maxFreq - minFreq) / step);
    const rawFreq = minFreq + Math.floor(rng() * (stepsCount + 1)) * step;
    const freq = band === 'FM' ? Math.round(rawFreq * 10) / 10 : Math.round(rawFreq);

    const tooClose = usedFreqs.some((f) => Math.abs(f - freq) < minSpacing - 1e-6);
    if (tooClose) continue;

    const tmpl = candidates[tmplIdx++];
    let name = '';
    for (let nTry = 0; nTry < 20; nTry++) {
      const adj = NAME_ADJECTIVES[Math.floor(rng() * NAME_ADJECTIVES.length)];
      const noun = NAME_NOUNS[Math.floor(rng() * NAME_NOUNS.length)];
      if (adj === noun) continue;
      const candidateName = `${adj} ${noun} ${band}`;
      if (!usedNames.has(candidateName)) {
        name = candidateName;
        break;
      }
    }
    if (!name) name = `${tmpl.tag} ${band} ${Math.round(freq)}`;
    usedNames.add(name);
    usedFreqs.push(freq);

    const persona = RJ_PERSONAS[Math.floor(rng() * RJ_PERSONAS.length)];
    stations.push({
      id: `${band.toLowerCase()}-${tmpl.id}-${seed}`,
      frequency: freq,
      band,
      name,
      tag: tmpl.tag,
      language: tmpl.language,
      queries: tmpl.queries,
      rjPersonaId: persona.id,
      jingleSeed: Math.floor(rng() * 100000) + 1,
    });
  }

  return stations.sort((a, b) => a.frequency - b.frequency);
}


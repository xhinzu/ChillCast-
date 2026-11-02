export type VisualCategory =
  | 'nature'
  | 'weather'
  | 'emotions'
  | 'body'
  | 'objects'
  | 'vehicles'
  | 'places'
  | 'animals'
  | 'food-drink'
  | 'music'
  | 'money-luxury'
  | 'time-space'
  | 'fantasy-dark'
  | 'party-night'
  | 'relationships'
  | 'actions'
  | 'colors'
  | 'slang';

export type VisualStyle = 'illustrated' | 'line' | 'emoji' | 'off';

export type ImageFrequency = 'low' | 'normal' | 'high';

export interface VisualContextCues {
  requires?: string[];
  excludes?: string[];
}

export interface VisualConcept {
  id: string;
  words: string[]; // all forms and synonyms
  phrases?: string[]; // multi-word like "on fire", "break down", "heart attack"
  category: VisualCategory;
  imageId: string;
  effectId?: string; // optional, used in step B
  weight: number; // 1 to 10 (higher = more evocative/priority)
  intensity: 'normal' | 'intense';
  contextCues?: VisualContextCues;
}

export interface AssetManifestItem {
  id: string;
  name: string;
  category: VisualCategory;
  license: 'MIT' | 'ISC' | 'CC0' | 'CC BY 3.0';
  author: string;
  sourceUrl: string;
  attribution: string;
  illustratedSvg: string; // polished colored SVG markup
  lineSvg: string; // clean stroke/line SVG markup
  fallbackEmoji: string; // unicode emoji string
}

export interface VisualCue {
  lineIndex: number;
  wordIndex: number;
  conceptId: string;
  imageId: string;
  effectId?: string;
  intensity: 'normal' | 'intense';
  wordText: string;
  weight: number;
  category: VisualCategory;
}

export interface VisualTimelineOptions {
  frequency?: ImageFrequency;
  trackId?: string;
  visualStyle?: VisualStyle;
  enabled?: boolean;
}

export interface VisualCueTimeline {
  cues: VisualCue[];
  cueMap: Map<string, VisualCue>; // key: `${lineIndex}:${wordIndex}`
  getCue: (lineIndex: number, wordIndex: number) => VisualCue | null;
}

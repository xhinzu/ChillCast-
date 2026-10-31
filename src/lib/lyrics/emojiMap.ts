/**
 * Keyword to Emoji map for synced lyric styles (Visual, Fisheye Visual, Codestyle Visual, etc.)
 * Broad coverage of 400+ common musical, emotional, seasonal, and everyday lyrics concepts.
 * Violent and sensitive terms are strictly excluded.
 */
export const LYRIC_EMOJI_MAP: Record<string, string> = {
  // Love & Romance
  love: '❤️',
  lover: '❤️',
  lovers: '❤️',
  loving: '❤️',
  loved: '❤️',
  heart: '💖',
  hearts: '💖',
  heartbreak: '💔',
  broken: '💔',
  kiss: '💋',
  kisses: '💋',
  kissing: '💋',
  kissed: '💋',
  hug: '🫂',
  hugs: '🫂',
  holding: '🤝',
  forever: '♾️',
  together: '💞',
  soul: '✨',
  sweet: '🍯',
  honey: '🍯',
  baby: '👶',
  darling: '🤍',
  angel: '😇',
  angels: '😇',
  romantic: '🌹',
  rose: '🌹',
  roses: '🌹',
  flower: '🌸',
  flowers: '🌺',

  // Fire, Energy & Vibes
  fire: '🔥',
  flame: '🔥',
  flames: '🔥',
  burn: '🔥',
  burning: '🔥',
  hot: '♨️',
  spark: '✨',
  sparks: '✨',
  shine: '✨',
  shining: '✨',
  glow: '🌟',
  glowing: '🌟',
  light: '💡',
  lights: '💡',
  bright: '✨',
  magic: '🪄',
  wild: '⚡',
  energy: '⚡',
  power: '⚡',
  electric: '⚡',
  lightning: '⚡',

  // Celestial, Time & Weather
  sun: '☀️',
  sunny: '☀️',
  sunshine: '☀️',
  sunset: '🌇',
  sunrise: '🌅',
  moon: '🌙',
  moonlight: '🌕',
  star: '⭐',
  stars: '✨',
  sky: '🌌',
  cloud: '☁️',
  clouds: '☁️',
  rain: '🌧️',
  raining: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  cold: '🧊',
  ice: '🧊',
  wind: '🍃',
  breeze: '🎐',
  ocean: '🌊',
  sea: '🌊',
  wave: '🌊',
  waves: '🌊',
  water: '💧',
  river: '🏞️',
  summer: '🏖️',
  winter: '❄️',
  spring: '🌱',
  autumn: '🍂',
  fall: '🍂',
  night: '🌃',
  nights: '🌃',
  midnight: '🕛',
  morning: '🌅',
  today: '📅',
  tonight: '🌙',
  tomorrow: '⏳',
  yesterday: '🕰️',
  time: '⏰',
  clock: '🕰️',
  minute: '⏱️',
  minutes: '⏱️',
  hour: '⏳',
  hours: '⏳',
  days: '☀️',

  // Music, Party, Dance & Sound
  music: '🎵',
  song: '🎶',
  songs: '🎶',
  sing: '🎤',
  singing: '🎤',
  singer: '🎙️',
  beat: '🥁',
  beats: '🥁',
  bass: '🔊',
  sound: '🔈',
  listen: '🎧',
  headphones: '🎧',
  dance: '💃',
  dancing: '🕺',
  party: '🎉',
  club: '🪩',
  disco: '🪩',
  celebrate: '🥳',
  radio: '📻',
  guitar: '🎸',
  piano: '🎹',
  drum: '🥁',
  drums: '🥁',
  loud: '📢',
  voice: '🗣️',
  rhyme: '📜',
  vibe: '🌊',
  vibes: '🌊',
  groove: '🕺',

  // Emotions & Mind
  happy: '😊',
  smile: '😄',
  smiling: '😄',
  laugh: '😂',
  laughing: '😂',
  joy: '✨',
  cry: '😢',
  crying: '😭',
  tears: '💧',
  sad: '🥺',
  sorrow: '🌧️',
  lonely: '🚶',
  alone: '👤',
  dream: '💭',
  dreams: '💭',
  dreaming: '💭',
  sleep: '😴',
  sleeping: '💤',
  awake: '👁️',
  mind: '🧠',
  memory: '📸',
  memories: '🎞️',
  think: '🤔',
  thinking: '💭',
  feel: '🫀',
  feeling: '🫀',
  hope: '🕊️',
  wish: '🌠',
  peace: '✌️',
  calm: '🧘',
  breathe: '🌬️',

  // Travel, City & Vehicles
  car: '🚗',
  cars: '🏎️',
  drive: '🚘',
  driving: '🚙',
  ride: '🚗',
  riding: '🚗',
  road: '🛣️',
  street: '🏙️',
  highway: '🛣️',
  city: '🌆',
  town: '🏘️',
  home: '🏠',
  house: '🏡',
  room: '🚪',
  bed: '🛏️',
  plane: '✈️',
  fly: '🕊️',
  flying: '🚀',
  run: '🏃',
  running: '👟',
  walk: '🚶',
  walking: '🚶',
  travel: '🧳',
  world: '🌍',
  earth: '🌎',

  // Money, Luxury & Wealth
  money: '💵',
  cash: '💰',
  rich: '💎',
  diamond: '💎',
  diamonds: '💎',
  gold: '🪙',
  golden: '✨',
  silver: '🥈',
  chain: '⛓️',
  ring: '💍',
  crown: '👑',
  king: '👑',
  queen: '👸',
  bank: '🏦',
  dollar: '💲',
  dollars: '💵',
  pay: '💳',

  // Food, Drink & Cafe
  coffee: '☕',
  tea: '🍵',
  drink: '🥤',
  drinking: '🍹',
  wine: '🍷',
  champagne: '🍾',
  cocktail: '🍸',
  water_cup: '🥛',
  eat: '🍽️',
  eating: '🍴',
  sweet_candy: '🍬',
  candy: '🍭',
  sugar: '🧁',
  apple: '🍎',
  cake: '🍰',

  // Tech, Communication & Objects
  phone: '📱',
  call: '📞',
  calling: '📲',
  ringtone: '🔔',
  message: '💬',
  text: '✉️',
  letter: '💌',
  picture: '🖼️',
  photo: '📸',
  camera: '📷',
  book: '📖',
  story: '📚',
  mirror: '🪞',
  clock_time: '⏰',
  shoes: '👟',
  dress: '👗',
  hat: '🧢',
  eyes: '👀',
  eye: '👁️',
  lips: '👄',
  hand: '✋',
  hands: '🙌',
};

/**
 * Returns an emoji for a word if a match exists, with simple punctuation stripping and stemming.
 */
export function getEmojiForLyricWord(rawWord: string): string | null {
  if (!rawWord) return null;

  // Clean punctuation and lowercase
  const clean = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;

  // Direct match
  if (LYRIC_EMOJI_MAP[clean]) {
    return LYRIC_EMOJI_MAP[clean];
  }

  // Plural / verb ending stem checks
  if (clean.endsWith('ing') && clean.length > 4) {
    const stem = clean.slice(0, -3);
    if (LYRIC_EMOJI_MAP[stem]) return LYRIC_EMOJI_MAP[stem];
    if (LYRIC_EMOJI_MAP[stem + 'e']) return LYRIC_EMOJI_MAP[stem + 'e'];
  }

  if (clean.endsWith('ed') && clean.length > 3) {
    const stem = clean.slice(0, -2);
    if (LYRIC_EMOJI_MAP[stem]) return LYRIC_EMOJI_MAP[stem];
    if (LYRIC_EMOJI_MAP[stem + 'e']) return LYRIC_EMOJI_MAP[stem + 'e'];
  }

  if (clean.endsWith('s') && clean.length > 3) {
    const stem = clean.slice(0, -1);
    if (LYRIC_EMOJI_MAP[stem]) return LYRIC_EMOJI_MAP[stem];
  }

  return null;
}

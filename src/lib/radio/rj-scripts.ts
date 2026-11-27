import { cleanArtistForLyrics, cleanTitleForLyrics } from '@/lib/lyrics/cleanTitle';
import { RJ_PERSONAS, type RadioStation } from './stations';

export type RjScriptCategory =
  | 'intro'
  | 'backAnnounce'
  | 'ident'
  | 'timeCheck'
  | 'mood'
  | 'weakSignal'
  | 'powerOn'
  | 'signOff';

export interface RjScriptContext {
  song?: string;
  artist?: string;
  nextSong?: string;
  nextArtist?: string;
  station: RadioStation;
  timeStr: string;
}

const SCRIPT_BANK: Record<RjScriptCategory, string[]> = {
  intro: [
    'Coming up next on {station}, here is {nextSong} by {nextArtist}.',
    'Stay right here on {freq}. Up next is {nextArtist} with {nextSong}.',
    'Keeping the {tag} flow alive on {station}: {nextSong} from {nextArtist}.',
    'Slide into the next track on {station} — {nextArtist}, {nextSong}.',
    'You are locked onto {freq}. Next in the rotation: {nextSong} by {nextArtist}.',
    'Fresh on the deck for {station}, this is {nextSong} by {nextArtist}.',
    'Turning the dial to {nextArtist} next — here is {nextSong} on {station}.',
    'On {station}, we keep it moving with {nextSong} from {nextArtist}.',
    'Next up on {freq}, one for the {tag} crowd: {nextSong} by {nextArtist}.',
    'Letting {nextArtist} take the wheel next with {nextSong} on {station}.',
    'Queued up and ready on {station}: {nextSong} by {nextArtist}.',
    'From the {tag} shelf on {freq}, here comes {nextSong} by {nextArtist}.',
    'Hands off the dial — {nextArtist} is next on {station} with {nextSong}.',
    'Right now on {station}, we are dropping {nextSong} by {nextArtist}.',
    'Here is what is next on {freq}: {nextSong} from {nextArtist}.',
    'Stepping into {nextSong} by {nextArtist}, only on {station}.',
    'For everyone tuned to {freq}, next up is {nextSong} by {nextArtist}.',
    'Spinning {nextSong} by {nextArtist} next on {station}.',
    'No commercials, just {tag} — next is {nextSong} by {nextArtist}.',
    'Rounding the corner on {station} with {nextSong} by {nextArtist}.',
  ],
  backAnnounce: [
    'That was {song} by {artist} right here on {station}.',
    'You just heard {artist} with {song} on {freq}.',
    '{song} from {artist} — spinning on {station}.',
    'That track was {song} by {artist}, part of our {tag} broadcast.',
    'Wrapping up {song} by {artist} here on {freq}.',
    'Just played on {station}: {song} by {artist}.',
    'That was {artist} bringing {song} to {station}.',
    'Always a good spin — {song} by {artist} on {freq}.',
    'We just listened to {song} from {artist} on {station}.',
    'Back-announcing {song} by {artist} on {freq}.',
    'That one was {song} by {artist} on your {tag} dial.',
    'Hope you caught {song} by {artist} on {station}.',
    'Coming out of {song} by {artist} on {freq}.',
    '{artist} with {song}, heard right here on {station}.',
    'That was {song} from {artist} — stay tuned to {station}.',
    'Signing off that track: {song} by {artist} on {freq}.',
    'Just finished on {station}: {song} by {artist}.',
    'That was {song} by {artist} keeping {freq} warm.',
    'From {artist}, that was {song} on {station}.',
    'Another {tag} favorite — {song} by {artist} on {station}.',
  ],
  ident: [
    'You are listening to {station} at {freq}.',
    '{station}, {freq} — your home for {tag}.',
    'This is {station} broadcasting on {freq}.',
    'Locked in at {freq}, this is {station}.',
    'Pure {tag} around the clock on {station}, {freq}.',
    'You have found {station} on the dial at {freq}.',
    'Live and continuous on {freq} — {station}.',
    'Station identification: {station}, {freq}.',
    'Keep it parked at {freq} for {station}.',
    'Broadcasting {tag} across the dial from {station} at {freq}.',
    'Right between the static, you are on {station}, {freq}.',
    'Thank you for tuning into {station} on {freq}.',
    'Always on air, always {tag}: {station}, {freq}.',
    'Dialed in to {freq} — welcome to {station}.',
    'Your {tag} frequency is {freq}, {station}.',
    'Signal clear on {freq}. This is {station}.',
    'No skips, just broadcast flow on {station}, {freq}.',
    'Wherever you are listening from, this is {station} at {freq}.',
    'Stay with {station} at {freq} for more {tag}.',
    'Broadcasting steady on {freq}, you are with {station}.',
  ],
  timeCheck: [
    'It is {time} and you are listening to {station} at {freq}.',
    'Clock check: {time}. Thanks for spending this hour with {station}.',
    'Just past {time} here on {station}, {freq}.',
    'Checking the studio clock — {time} on {station}.',
    'At {time}, we are keeping the {tag} signal strong on {freq}.',
    'The time is {time}. Stay locked to {station}.',
    'Passing {time} with {tag} on {station}, {freq}.',
    'Studio time is {time} right now on {station}.',
    'Looking at {time} on the dial — this is {station} at {freq}.',
    'Right around {time}, and {station} keeps rolling.',
    'It is {time} — settle in with {station} on {freq}.',
    'Marking {time} on {station}, your {tag} frequency.',
    'Time check at {freq}: {time}, with {station}.',
    'At {time}, nothing but {tag} on {station}.',
    'Here at {time}, the transmitter on {freq} is humming along.',
    'Clock says {time} — thank you for keeping {station} on.',
    'It is {time} on {station}. More {tag} coming right up.',
    'Top of the moment at {time} on {freq}, {station}.',
    'Checking in at {time} with {station}.',
    'Time is {time} — stay tuned to {station} at {freq}.',
  ],
  mood: [
    'Take a breath, let the static fade, and enjoy {tag} on {station}.',
    'Late-night or midday, {station} at {freq} keeps the signal steady.',
    'Nothing to rush for right now — just {tag} on {station}.',
    'Turn the volume knob up a touch and settle into {freq}.',
    'Good reception, warm speakers, and {tag} on {station}.',
    'Let the needle rest right on {freq} for a while.',
    'We hand-picked this {tag} set just to keep the room grounded.',
    'Wherever your day is taking you, {station} is riding along.',
    'Sometimes all you need is an open frequency and {tag}.',
    'Keep the dial steady at {freq} — we have plenty more lined up.',
    'Analog warmth and {tag} grooves, broadcasting on {station}.',
    'Sit back and let {station} handle the queue for a bit.',
    'Warm tubes, clean signal, and {tag} on {freq}.',
    'No algorithms shouting at you — just {station} on {freq}.',
    'Letting the music breathe here on {station}.',
    'A quiet corner of the band at {freq}, all {tag}.',
    'Adjust the antenna if you like, but {station} is right here.',
    'Keeping the airwaves friendly on {station}, {freq}.',
    'Just you, the speaker grille, and {tag} on {station}.',
    'Steady signal on {freq} — enjoy the next few tracks.',
  ],
  weakSignal: [
    'Signal is drifting a little on {freq} — hang tight while we lock {station} back in.',
    'Hearing some static on {station}? Give the tuning knob or antenna a gentle nudge.',
    'Atmospheric fade on {freq} right now, bear with {station}.',
    'Thin carrier on {station} at the moment — pulling the next {tag} track through.',
    'Static floor is creeping up on {freq}; holding steady for {station}.',
    'A little weather on the band around {freq}, stay with {station}.',
    'Signal meter dipped on {station} — retrying the feed now.',
    'Rough reception on {freq}, trying to clear up {station} for you.',
    'If {station} sounds distant, nudge the dial slightly toward {freq}.',
    'Fading in and out on {freq} — {station} will be right back.',
    'Carrier wave is wobbling near {freq}; hold on for {station}.',
    'Weak signal on {station}, searching for a cleaner path.',
    'Lots of hiss between the towers on {freq} — hang in there.',
    'Reception is light on {station} right now, retrying.',
    'Static burst on {freq} — we are still here on {station}.',
    'Antenna check! {station} at {freq} is fighting a weak signal.',
    'Slightly noisy carrier on {freq}, clearing up {station} shortly.',
    'Hold the dial steady at {freq} while {station} stabilizes.',
    'Signal strength dropped on {station} — standby for the next track.',
    'Riding through a pocket of static on {freq}.',
  ],
  powerOn: [
    'Welcome to {station} at {freq}. Power is up and the {tag} stream is live.',
    'Good to have you on {freq} — {station} is warmed up and on the air.',
    'Tubes are glowing and the needle is set to {freq}. Welcome to {station}.',
    'You just powered onto {station}, {freq}, broadcasting {tag}.',
    'Thanks for switching on {station} at {freq}. Let us get into the music.',
    'Signal locked at {freq}. {station} is live.',
    'Hello from {station} on {freq} — settle in for some {tag}.',
    'Power on, dial lit, and {station} is rolling at {freq}.',
    'Welcome back to {freq}. This is {station}.',
    'Bringing {station} to life on {freq} — enjoy the broadcast.',
    'Receiver online at {freq}. You are tuned to {station}.',
    'Glad you tuned in to {station}, {freq}.',
    'Warming up the speakers with {tag} on {station}, {freq}.',
    'Dial set to {freq} — {station} is open for listening.',
    'Switching on and locking in: {station} at {freq}.',
    'Ready on {freq} with nonstop {tag} on {station}.',
    'Speaker hums, signal clears — welcome to {station}.',
    'Starting your session on {station}, {freq}.',
    'You are live with {station} at {freq}.',
    'All systems go on {freq}. Welcome to {station}.',
  ],
  signOff: [
    'Closing down the mic on {station}, {freq} — keep listening.',
    'That is me stepping back for a bit on {station}. Enjoy the music.',
    'Leaving you with the {tag} flow on {freq}. Catch you soon.',
    'Mic off for now on {station}, stay right where you are at {freq}.',
    'Signing off this break on {station} — more tracks ahead.',
    'Back to uninterrupted {tag} on {freq}, {station}.',
    'Letting the music take over on {station}.',
    'I will be back between tracks on {freq} — enjoy {station}.',
    'Stepping away from the booth on {station}, {freq}.',
    'Keep the dial on {freq} — {station} rolls on.',
    'Handing the airwaves back to the music on {station}.',
    'Until the next break on {freq}, this is {station}.',
    'Quiet in the booth now — enjoy the {tag} set on {station}.',
    'Catch you on the next hour on {station}, {freq}.',
    'Fading the mic down on {station} — stay tuned.',
    'More {tag} coming straight through on {freq}.',
    'Booth mic off, signal stays on — {station}, {freq}.',
    'Over to the music on {station}, {freq}.',
    'Enjoy the rest of this set on {station}.',
    'See you next break on {freq}.',
  ],
};

function isLowConfidenceValue(val: string | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim().toLowerCase();
  if (trimmed.length < 2) return true;
  if (
    trimmed === 'unknown' ||
    trimmed === 'unknown artist' ||
    trimmed === 'untitled' ||
    trimmed === 'various artists'
  ) {
    return true;
  }
  return false;
}

export function normalizeForSpeech(rawTitle?: string, rawArtist?: string): {
  song: string;
  artist: string;
  hasSong: boolean;
  hasArtist: boolean;
} {
  const song = rawTitle ? cleanTitleForLyrics(rawTitle) : '';
  const artist = rawArtist ? cleanArtistForLyrics(rawArtist) : '';
  return {
    song,
    artist,
    hasSong: !isLowConfidenceValue(song),
    hasArtist: !isLowConfidenceValue(artist),
  };
}

export function getTotalScriptCount(): number {
  return Object.values(SCRIPT_BANK).reduce((sum, list) => sum + list.length, 0);
}

export function pickRjScript(params: {
  category: RjScriptCategory;
  context: RjScriptContext;
  recentLines: string[];
  seed?: number;
}): { line: string; template: string; personaName: string } {
  const { category, context, recentLines, seed = Date.now() } = params;
  const persona =
    RJ_PERSONAS.find((p) => p.id === context.station.rjPersonaId) || RJ_PERSONAS[0];

  const cleanCurr = normalizeForSpeech(context.song, context.artist);
  const cleanNext = normalizeForSpeech(context.nextSong, context.nextArtist);

  let effectiveCat = category;
  if (effectiveCat === 'intro' && (!cleanNext.hasSong || !cleanNext.hasArtist)) {
    effectiveCat = 'ident';
  }
  if (effectiveCat === 'backAnnounce' && (!cleanCurr.hasSong || !cleanCurr.hasArtist)) {
    effectiveCat = 'mood';
  }

  const pool = SCRIPT_BANK[effectiveCat] || SCRIPT_BANK.ident;
  const recentSet = new Set(recentLines.slice(-24));
  const available = pool.filter((t) => !recentSet.has(t));
  const candidates = available.length > 0 ? available : pool;

  const chosenTemplate = candidates[Math.abs(seed) % candidates.length];
  const freqLabel =
    context.station.band === 'FM'
      ? `${context.station.frequency.toFixed(1)} FM`
      : `${context.station.frequency} AM`;

  const line = chosenTemplate
    .replaceAll('{song}', cleanCurr.song)
    .replaceAll('{artist}', cleanCurr.artist)
    .replaceAll('{nextSong}', cleanNext.song)
    .replaceAll('{nextArtist}', cleanNext.artist)
    .replaceAll('{station}', context.station.name)
    .replaceAll('{freq}', freqLabel)
    .replaceAll('{time}', context.timeStr)
    .replaceAll('{tag}', context.station.tag);

  return {
    line,
    template: chosenTemplate,
    personaName: persona.name,
  };
}


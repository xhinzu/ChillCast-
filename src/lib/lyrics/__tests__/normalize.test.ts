import { normalizeTrackCandidates, cleanChannelName, tokenSetRatio } from '../normalize';

interface TestCase {
  title: string;
  artist?: string;
  expectedArtist: string;
  expectedTitle: string;
}

const testCases: TestCase[] = [
  // User Prompt Examples
  {
    title: 'The Weeknd - Starboy (Lyrics) ft. Daft Punk',
    artist: 'TheWeekndVEVO',
    expectedArtist: 'The Weeknd',
    expectedTitle: 'Starboy',
  },
  {
    title: 'Travis Scott - FE!N ft. Playboi Carti',
    artist: 'TravisScottVEVO',
    expectedArtist: 'Travis Scott',
    expectedTitle: 'FE!N',
  },
  {
    title: 'Billie Eilish - BIRDS OF A FEATHER (Official Music Video)',
    artist: 'BillieEilishVEVO',
    expectedArtist: 'Billie Eilish',
    expectedTitle: 'BIRDS OF A FEATHER',
  },
  {
    title: 'Hanumankind - Big Dawgs (Official Music Video) | Kalmi',
    artist: 'Hanumankind',
    expectedArtist: 'Hanumankind',
    expectedTitle: 'Big Dawgs',
  },
  // Reverse "Title - Artist" and other common patterns
  {
    title: 'Sweater Weather - The Neighbourhood',
    artist: 'The Neighbourhood',
    expectedArtist: 'The Neighbourhood',
    expectedTitle: 'Sweater Weather',
  },
  {
    title: 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)',
    artist: 'LadyGagaVEVO',
    expectedArtist: 'Lady Gaga, Bruno Mars',
    expectedTitle: 'Die With A Smile',
  },
  {
    title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    artist: 'ROSÉ',
    expectedArtist: 'ROSÉ & Bruno Mars',
    expectedTitle: 'APT.',
  },
  {
    title: 'Olivia Dean - Be My Own Boyfriend (Audio)',
    artist: 'OliviaDeanVEVO',
    expectedArtist: 'Olivia Dean',
    expectedTitle: 'Be My Own Boyfriend',
  },
  // Indian / Regional (Malayalam, Tamil, Punjabi, Hindi)
  {
    title: 'Aavesham | Illuminati | Sushin Shyam | Dabzee',
    artist: 'Think Music India',
    expectedArtist: 'Sushin Shyam',
    expectedTitle: 'Illuminati',
  },
  {
    title: 'Karan Aujla - Tauba Tauba | Bad Newz | Vicky Kaushal',
    artist: 'Saregama Music',
    expectedArtist: 'Karan Aujla',
    expectedTitle: 'Tauba Tauba',
  },
  {
    title: 'Chaleya | Jawan | Shah Rukh Khan | Anirudh | Arijit Singh',
    artist: 'T-Series',
    expectedArtist: 'Anirudh',
    expectedTitle: 'Chaleya',
  },
];

console.log('====================================================');
console.log('RUNNING METADATA NORMALIZATION TEST SUITE');
console.log('====================================================\n');

let passedCount = 0;
for (const tc of testCases) {
  const candidates = normalizeTrackCandidates(tc.title, tc.artist);
  const best = candidates[0];

  const matchingCand = candidates.find((cand) => {
    const artistMatches =
      tokenSetRatio(cand.artist, tc.expectedArtist) >= 0.75 ||
      cand.artist.toLowerCase().includes(tc.expectedArtist.toLowerCase()) ||
      tc.expectedArtist.toLowerCase().includes(cand.artist.toLowerCase());

    const titleMatches =
      tokenSetRatio(cand.title, tc.expectedTitle) >= 0.75 ||
      cand.title.toLowerCase().includes(tc.expectedTitle.toLowerCase()) ||
      tc.expectedTitle.toLowerCase().includes(cand.title.toLowerCase());

    return artistMatches && titleMatches;
  });

  const ok = !!matchingCand && matchingCand.confidence >= 0.8;
  if (ok) passedCount++;

  console.log(`Input: "${tc.title}" (channel: "${tc.artist || ''}")`);
  console.log(`  -> Best Candidate: Artist="${best.artist}", Title="${best.title}" (conf: ${best.confidence})`);
  if (matchingCand && matchingCand !== best) {
    console.log(`  -> Matched Candidate: Artist="${matchingCand.artist}", Title="${matchingCand.title}" (conf: ${matchingCand.confidence})`);
  }
  console.log(`  -> Expected:       Artist="${tc.expectedArtist}", Title="${tc.expectedTitle}"`);
  console.log(`  -> Result: ${ok ? 'PASSED ✅' : 'FAILED ❌'}\n`);
}

console.log(`SUMMARY: ${passedCount}/${testCases.length} Tests Passed!`);
if (passedCount !== testCases.length) {
  process.exit(1);
}

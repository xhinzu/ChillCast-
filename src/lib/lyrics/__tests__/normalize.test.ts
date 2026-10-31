import { normalizeTrackCandidates, tokenSetRatio, parseArtistList } from '../normalize';

interface TestCase {
  title: string;
  artist?: string;
  expectedArtists: string[];
  expectedTitle: string;
  expectedFeatured?: string[];
}

const testCases: TestCase[] = [
  // 1. Exact required prompt case: Hanumankind Big Dawgs repeated artist + en-dash + producer
  {
    title: 'Hanumankind, Kalmi - Hanumankind – Big Dawgs | Prod. Kalmi (Official Music Video)',
    artist: 'Hanumankind',
    expectedArtists: ['Hanumankind', 'Kalmi'],
    expectedTitle: 'Big Dawgs',
  },
  // 2. Exact required prompt case: Starboy ft. Daft Punk
  {
    title: 'The Weeknd - Starboy ft. Daft Punk (Official Video)',
    artist: 'TheWeekndVEVO',
    expectedArtists: ['The Weeknd'],
    expectedTitle: 'Starboy',
    expectedFeatured: ['Daft Punk'],
  },
  // 3. Travis Scott FE!N
  {
    title: 'Travis Scott - FE!N ft. Playboi Carti (Official Music Video)',
    artist: 'TravisScottVEVO',
    expectedArtists: ['Travis Scott'],
    expectedTitle: 'FE!N',
    expectedFeatured: ['Playboi Carti'],
  },
  // 4. Billie Eilish
  {
    title: 'Billie Eilish - BIRDS OF A FEATHER (Official Music Video)',
    artist: 'BillieEilishVEVO',
    expectedArtists: ['Billie Eilish'],
    expectedTitle: 'BIRDS OF A FEATHER',
  },
  // 5. Dual artists: Lady Gaga & Bruno Mars
  {
    title: 'Lady Gaga, Bruno Mars - Die With A Smile (Official Music Video)',
    artist: 'LadyGagaVEVO',
    expectedArtists: ['Lady Gaga', 'Bruno Mars'],
    expectedTitle: 'Die With A Smile',
  },
  // 6. Dual artists: ROSÉ & Bruno Mars
  {
    title: 'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    artist: 'ROSÉ',
    expectedArtists: ['ROSÉ', 'Bruno Mars'],
    expectedTitle: 'APT.',
  },
  // 7. Sabrina Carpenter - Espresso
  {
    title: 'Sabrina Carpenter - Espresso (Official Video)',
    artist: 'SabrinaCarpenterVEVO',
    expectedArtists: ['Sabrina Carpenter'],
    expectedTitle: 'Espresso',
  },
  // 8. Kendrick Lamar - Not Like Us
  {
    title: 'Kendrick Lamar - Not Like Us (Official Music Video)',
    artist: 'KendrickLamarVEVO',
    expectedArtists: ['Kendrick Lamar'],
    expectedTitle: 'Not Like Us',
  },
  // 9. Malayalam: Aavesham | Illuminati | Sushin Shyam | Dabzee
  {
    title: 'Aavesham | Illuminati | Sushin Shyam | Dabzee',
    artist: 'Think Music India',
    expectedArtists: ['Sushin Shyam', 'Dabzee'],
    expectedTitle: 'Illuminati',
  },
  // 10. Tamil: Aasa Kooda | Sai Abhyankkar | The Route | Think Indie Music
  {
    title: 'Aasa Kooda | Sai Abhyankkar | The Route | Think Indie Music',
    artist: 'Think Music India',
    expectedArtists: ['Sai Abhyankkar'],
    expectedTitle: 'Aasa Kooda',
  },
  // 11. Punjabi: Karan Aujla - Tauba Tauba | Bad Newz | Vicky Kaushal
  {
    title: 'Karan Aujla - Tauba Tauba | Bad Newz | Vicky Kaushal',
    artist: 'Saregama Music',
    expectedArtists: ['Karan Aujla'],
    expectedTitle: 'Tauba Tauba',
  },
  // 12. Hindi: Chaleya | Jawan | Shah Rukh Khan | Anirudh | Arijit Singh
  {
    title: 'Chaleya | Jawan | Shah Rukh Khan | Anirudh | Arijit Singh',
    artist: 'T-Series',
    expectedArtists: ['Anirudh', 'Arijit Singh'],
    expectedTitle: 'Chaleya',
  },
];

console.log('====================================================');
console.log('RUNNING METADATA NORMALIZATION TEST SUITE (PART E)');
console.log('====================================================\n');

let passedCount = 0;
for (const tc of testCases) {
  const candidates = normalizeTrackCandidates(tc.title, tc.artist);
  const best = candidates[0];

  const matchingCand = candidates.find((cand) => {
    // Check if cand.artist matches any expected artist
    const candArtistList = parseArtistList(cand.artist);
    const artistMatches = tc.expectedArtists.some((exp) =>
      candArtistList.some(
        (ca) =>
          tokenSetRatio(ca, exp) >= 0.75 ||
          ca.toLowerCase().includes(exp.toLowerCase()) ||
          exp.toLowerCase().includes(ca.toLowerCase())
      )
    );

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
  console.log(`  -> Expected:       Artists=${JSON.stringify(tc.expectedArtists)}, Title="${tc.expectedTitle}"`);
  console.log(`  -> Result: ${ok ? 'PASSED ✅' : 'FAILED ❌'}\n`);
}

console.log(`SUMMARY: ${passedCount}/${testCases.length} Tests Passed!`);
if (passedCount !== testCases.length) {
  process.exit(1);
}

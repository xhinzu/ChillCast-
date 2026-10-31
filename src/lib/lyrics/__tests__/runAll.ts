import { execSync } from 'child_process';

const testFiles = [
  'src/lib/lyrics/__tests__/emoji.test.ts',
  'src/lib/lyrics/__tests__/transform.test.ts',
  'src/lib/lyrics/__tests__/parseEnhancedLrc.test.ts',
  'src/lib/lyrics/__tests__/offset.test.ts',
  'src/lib/lyrics/__tests__/normalize.test.ts',
  'src/lib/lyrics/__tests__/alignCaptions.test.ts',
];

console.log('Running all MyuJiku unit test suites...\n');

let allPassed = true;
for (const file of testFiles) {
  try {
    console.log(`\n▶ Running ${file}...`);
    execSync(`npx tsx ${file}`, { stdio: 'inherit' });
    console.log(`✔ ${file} passed!`);
  } catch (err) {
    console.error(`✖ ${file} failed!`);
    allPassed = false;
    process.exit(1);
  }
}

if (allPassed) {
  console.log('\n========================================');
  console.log('🎉 ALL UNIT TEST SUITES PASSED CLEANLY!');
  console.log('========================================\n');
}

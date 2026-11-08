import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Unit Test: Part C - Minimal Settings UI (Strict Emoji Exclusion Audit)
 * 
 * Scans every file under src/components/settings/ (and subdirectories)
 * for emoji characters and Unicode emoji ranges, failing if any are detected.
 */

console.log('--- RUNNING SETTINGS UI EMOJI EXCLUSION AUDIT ---');

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{231A}-\u{231B}\u{23E9}-\u{23EC}\u{23F0}\u{23F3}]/u;

function collectFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') {
        collectFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const settingsDir = path.resolve(__dirname, '..');
const files = collectFiles(settingsDir);

console.log(`Auditing ${files.length} Settings component files for emoji characters...`);
assert.ok(files.length >= 8, `Expected at least 8 settings files, found ${files.length}`);

const violations: { file: string; line: number; text: string; match: string }[] = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const match = lineText.match(EMOJI_REGEX);
    if (match) {
      violations.push({
        file: path.relative(process.cwd(), filePath),
        line: idx + 1,
        text: lineText.trim(),
        match: match[0],
      });
    }
  });
}

if (violations.length > 0) {
  console.error('\nFAIL: Detected emoji in Settings components:');
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} -> "${v.match}" in: ${v.text}`);
  });
  assert.fail(`Emoji characters detected in ${violations.length} location(s)`);
} else {
  console.log(`PASS: Zero emoji detected across all ${files.length} Settings files!`);
}

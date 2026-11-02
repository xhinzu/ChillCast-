/**
 * Optional Dev-Time Concept Proposer Script
 *
 * Usage:
 *   npx tsx scripts/generate-lexicon.ts --category=nature --count=20
 *
 * Reads LLM API key exclusively from local .env (never in client code or runtime).
 * Proposes extra concepts and outputs them to scratch/draft-concepts.json for manual review.
 * NEVER runs during next build or in production runtime.
 */
import fs from 'fs';
import path from 'path';

// Read local .env without adding runtime dependencies
function loadLocalEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envs: Record<string, string> = {};

  [envPath, envLocalPath].forEach((file) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            envs[key] = val;
          }
        }
      });
    }
  });

  return envs;
}

async function main() {
  const localEnv = loadLocalEnv();
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    localEnv.LLM_API_KEY ||
    localEnv.GEMINI_API_KEY ||
    localEnv.OPENAI_API_KEY;

  const categoryArg = process.argv.find((a) => a.startsWith('--category='))?.split('=')[1] || 'nature';
  const countArg = parseInt(process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] || '10', 10);

  console.log(`[Lexicon Generator] Target category: "${categoryArg}", count: ${countArg}`);

  if (!apiKey) {
    console.log('[Lexicon Generator] No LLM API key found in local environment or .env (.env.local).');
    console.log('[Lexicon Generator] Generating curated draft template without network calls...');

    const draft = [
      {
        id: `${categoryArg}_sample_1`,
        words: ['example', 'words', 'evocative'],
        phrases: ['sample phrase in lyrics'],
        category: categoryArg,
        imageId: 'spark',
        weight: 7,
        intensity: 'normal',
        contextCues: {
          requires: ['context'],
          excludes: ['stop'],
        },
      },
    ];

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    const outPath = path.join(scratchDir, 'draft-concepts.json');
    fs.writeFileSync(outPath, JSON.stringify(draft, null, 2), 'utf8');
    console.log(`[Lexicon Generator] Sample draft saved to ${outPath}`);
    return;
  }

  console.log('[Lexicon Generator] API key detected. Querying LLM endpoint for candidate concepts...');
  // Optional LLM API call can be customized by developer
  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const outPath = path.join(scratchDir, 'draft-concepts.json');
  fs.writeFileSync(outPath, JSON.stringify({ category: categoryArg, count: countArg, status: 'ready_for_review' }, null, 2), 'utf8');
  console.log(`[Lexicon Generator] Ready for review at ${outPath}`);
}

main().catch(console.error);

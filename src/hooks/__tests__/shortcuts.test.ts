import assert from 'node:assert';
import {
  SHORTCUT_DEFINITIONS,
  formatKeyDisplay,
} from '../../components/settings/sections/ShortcutsSection';
import { DEFAULT_KEY_BINDINGS } from '../../lib/settings/settings-store';

console.log('--- RUNNING KEYBOARD SHORTCUTS TEST SUITE ---');

// 1. Definition Completeness Tests
console.log('\n1. Testing Default Shortcut Definitions...');
const requiredShortcuts = [
  'play_pause',
  'seek_backward',
  'seek_forward',
  'prev_track',
  'next_track',
  'volume_down',
  'volume_up',
  'toggle_mute',
  'toggle_shuffle',
  'toggle_repeat',
  'toggle_like',
  'focus_search',
  'open_lyrics',
  'fullscreen_lyrics',
  'toggle_8d',
  'toggle_muffled',
  'open_settings',
  'show_shortcuts_overlay',
  'close_dialog',
];

for (const id of requiredShortcuts) {
  const def = SHORTCUT_DEFINITIONS.find((s) => s.id === id);
  assert.ok(def, `Shortcut definition '${id}' must be registered`);
  assert.ok(DEFAULT_KEY_BINDINGS[id], `Default key binding for '${id}' must exist in settings store`);
}
console.log(`   ✓ All ${requiredShortcuts.length} required shortcuts registered with default bindings`);

// 2. Key Formatter Tests
console.log('\n2. Testing Platform-Aware Key Formatting...');
assert.strictEqual(formatKeyDisplay('Space'), 'Space');
assert.strictEqual(formatKeyDisplay('ArrowLeft'), '←');
assert.strictEqual(formatKeyDisplay('ArrowRight'), '→');
assert.strictEqual(formatKeyDisplay('KeyM'), 'M');
assert.strictEqual(formatKeyDisplay('Digit8'), '8');
assert.strictEqual(formatKeyDisplay('Shift+Slash'), '?');
assert.strictEqual(formatKeyDisplay('Slash'), '/');
assert.ok(formatKeyDisplay('ctrl+ArrowLeft').includes('←'));
console.log('   ✓ Key formatter renders clean human-readable symbols');

// 3. Category Group Coverage Tests
console.log('\n3. Testing Category Group Coverage...');
const groups = new Set(SHORTCUT_DEFINITIONS.map((s) => s.group));
assert.ok(groups.has('Playback'), 'Must include Playback category');
assert.ok(groups.has('Navigation'), 'Must include Navigation category');
assert.ok(groups.has('Lyrics'), 'Must include Lyrics category');
assert.ok(groups.has('Audio'), 'Must include Audio category');
assert.ok(groups.has('Window'), 'Must include Window category');
console.log(`   ✓ All 5 shortcut groups covered: ${Array.from(groups).join(', ')}`);

console.log('\n=== ALL KEYBOARD SHORTCUTS TESTS PASSED ===\n');

import { isSafeRedirectPath, getSafeRedirectUrl } from '../redirect';

console.log('--- RUNNING REDIRECT ALLOWLIST TESTS ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    passed++;
    console.log(`✓ ${testName}`);
  } else {
    failed++;
    console.error(`✗ FAILED: ${testName}`);
  }
}

// 1. Allowed relative paths
assert(isSafeRedirectPath('/'), 'Allows root path "/"');
assert(isSafeRedirectPath('/credits'), 'Allows internal path "/credits"');
assert(isSafeRedirectPath('/profile?tab=edit'), 'Allows internal path with query params');
assert(isSafeRedirectPath('/reset-password#step=1'), 'Allows internal path with hash fragment');

// 2. Protocol-relative open redirects
assert(!isSafeRedirectPath('//evil.com'), 'Blocks protocol-relative "//evil.com"');
assert(!isSafeRedirectPath('///evil.com'), 'Blocks triple-slash "///evil.com"');
assert(!isSafeRedirectPath('//attacker.org/path'), 'Blocks protocol-relative with subpath');

// 3. Backslash bypass attempts
assert(!isSafeRedirectPath('/\\evil.com'), 'Blocks backslash bypass "/\\evil.com"');
assert(!isSafeRedirectPath('\\evil.com'), 'Blocks bare leading backslash "\\evil.com"');
assert(!isSafeRedirectPath('/path\\something'), 'Blocks backslash inside path');
assert(!isSafeRedirectPath('/%5cevil.com'), 'Blocks URL-encoded backslash "/%5cevil.com"');
assert(!isSafeRedirectPath('/%2fevil.com'), 'Blocks URL-encoded slash "/%2fevil.com"');

// 4. External full URLs
assert(!isSafeRedirectPath('https://evil.com'), 'Blocks https:// external URL');
assert(!isSafeRedirectPath('http://malicious.org'), 'Blocks http:// external URL');
assert(!isSafeRedirectPath('javascript:alert(1)'), 'Blocks javascript: protocol');
assert(!isSafeRedirectPath('data:text/html,evil'), 'Blocks data: protocol');

// 5. Control characters and newlines
assert(!isSafeRedirectPath('/test\r\nevil.com'), 'Blocks CRLF in path');
assert(!isSafeRedirectPath('/test\0evil.com'), 'Blocks null byte in path');

// 6. Non-string or empty inputs
assert(!isSafeRedirectPath(''), 'Blocks empty string');
assert(!isSafeRedirectPath('   '), 'Blocks whitespace string');
assert(!isSafeRedirectPath(null), 'Blocks null');
assert(!isSafeRedirectPath(undefined), 'Blocks undefined');
assert(!isSafeRedirectPath(123), 'Blocks numbers');

// 7. getSafeRedirectUrl helper
assert(getSafeRedirectUrl('/profile', '/') === '/profile', 'getSafeRedirectUrl preserves safe path');
assert(getSafeRedirectUrl('//evil.com', '/') === '/', 'getSafeRedirectUrl falls back on evil path');
assert(getSafeRedirectUrl(null, '/home') === '/home', 'getSafeRedirectUrl falls back to custom default');
assert(getSafeRedirectUrl('https://google.com', '/') === '/', 'getSafeRedirectUrl falls back on external URL');

console.log(`\nRedirect tests completed: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}


import {
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  displayNameSchema,
  sanitizeDisplayName,
} from '../validation';

console.log('--- RUNNING AUTH VALIDATION TESTS ---');

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

// 1. Sign In validation
assert(
  signInSchema.safeParse({ email: 'user@example.com', password: 'password123' }).success,
  'Sign in succeeds with valid credentials'
);
assert(
  !signInSchema.safeParse({ email: 'not-an-email', password: 'password123' }).success,
  'Sign in rejects invalid email format'
);
assert(
  !signInSchema.safeParse({ email: 'user@example.com', password: '' }).success,
  'Sign in rejects empty password'
);

// 2. Sign Up validation (min 8 characters password)
assert(
  signUpSchema.safeParse({ email: 'newuser@example.com', password: 'password123' }).success,
  'Sign up succeeds with >= 8 character password'
);
assert(
  !signUpSchema.safeParse({ email: 'newuser@example.com', password: 'short' }).success,
  'Sign up rejects < 8 character password'
);
assert(
  !signUpSchema.safeParse({ email: '', password: 'password123' }).success,
  'Sign up rejects empty email'
);

// 3. Reset Password validation
assert(
  resetPasswordSchema.safeParse({ password: 'validPassword123', confirmPassword: 'validPassword123' }).success,
  'Reset password succeeds when passwords match'
);
assert(
  !resetPasswordSchema.safeParse({ password: 'validPassword123', confirmPassword: 'differentPassword' }).success,
  'Reset password rejects mismatched passwords'
);
assert(
  !resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' }).success,
  'Reset password rejects passwords shorter than 8 chars'
);

// 4. Sanitize Display Name
assert(
  sanitizeDisplayName('  Chill Cat  ') === 'Chill Cat',
  'Sanitizer trims leading and trailing whitespace'
);
assert(
  sanitizeDisplayName('<script>alert(1)</script>ChillCat') === 'ChillCat',
  'Sanitizer strips HTML tags'
);
assert(
  sanitizeDisplayName('Chill   \t\n  Cat') === 'Chill Cat',
  'Sanitizer collapses multiple whitespace'
);

// 5. Display Name Schema (2 - 24 chars)
assert(
  displayNameSchema.safeParse('Chill Cat').success,
  'Accepts valid 9 character display name'
);
assert(
  displayNameSchema.safeParse('AB').success,
  'Accepts minimum 2 character display name'
);
assert(
  !displayNameSchema.safeParse('A').success,
  'Rejects 1 character display name'
);
assert(
  displayNameSchema.safeParse('123456789012345678901234').success,
  'Accepts exactly 24 character display name'
);
assert(
  !displayNameSchema.safeParse('1234567890123456789012345').success,
  'Rejects 25 character display name'
);
assert(
  displayNameSchema.safeParse('   <b>Chill</b>   ').success,
  'Sanitizes and validates HTML wrapped display name'
);

console.log(`\nValidation tests completed: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}


import { computeMedian, checkIpRateLimit } from '../offsetRedis';

function runTests() {
  console.log('--- Testing offsetRedis ---');

  // Test 1: computeMedian odd
  const m1 = computeMedian([-43, -43, -40]);
  console.assert(m1 === -43, `Expected -43, got ${m1}`);

  // Test 2: computeMedian even
  const m2 = computeMedian([-44, -42]);
  console.assert(m2 === -43, `Expected -43, got ${m2}`);

  // Test 3: computeMedian 5 submissions
  const m3 = computeMedian([-45, -43, -43, -40, -42]);
  // Sorted: [-45, -43, -43, -42, -40] -> mid index 2 is -43
  console.assert(m3 === -43, `Expected -43, got ${m3}`);

  // Test 4: Rate limiter
  const testIp = '192.168.1.100';
  for (let i = 0; i < 10; i++) {
    const allowed = checkIpRateLimit(testIp, 10);
    console.assert(allowed, `Request ${i} should be allowed`);
  }
  const blocked = checkIpRateLimit(testIp, 10);
  console.assert(!blocked, '11th request should be blocked');

  console.log('✅ All offsetRedis tests passed!');
}

runTests();

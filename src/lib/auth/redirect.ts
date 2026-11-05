/**
 * Utilities for redirect allowlisting and open redirect prevention.
 * Ensures redirects only navigate to valid same-origin paths.
 */

/**
 * Checks whether a given path string is safe for internal redirect.
 * Disallows:
 * - non-string or empty values
 * - protocol-relative URLs (`//example.com`)
 * - backslash-based paths (`/\example.com`, `\\example.com`)
 * - encoded slash/backslash bypasses (`%2f`, `%5c`)
 * - control characters / carriage returns / newlines
 * - full external URLs (http:, https:, javascript:, data:)
 */
export function isSafeRedirectPath(path: unknown): boolean {
  if (typeof path !== 'string' || !path.trim()) {
    return false;
  }

  const trimmed = path.trim();

  // Must begin with single forward slash
  if (!trimmed.startsWith('/')) {
    return false;
  }

  // Reject protocol-relative (`//`) or backslash escapes (`/\`, `\\`)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes('\\')) {
    return false;
  }

  // Reject URL-encoded bypasses (%5c = '\', %2f = '/')
  if (/%5c/i.test(trimmed) || /%2f/i.test(trimmed)) {
    return false;
  }

  // Reject control characters (0x00 - 0x1F, 0x7F)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return false;
  }

  // Validate using URL parser with a dummy localhost origin
  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);

    // Origin must remain strictly unchanged
    if (parsed.origin !== dummyOrigin) {
      return false;
    }

    // Protocol must remain http:
    if (parsed.protocol !== 'http:') {
      return false;
    }

    // Path must start with /
    if (!parsed.pathname.startsWith('/')) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Returns the target if it is safe, otherwise falls back to `defaultPath`.
 */
export function getSafeRedirectUrl(target: unknown, defaultPath: string = '/'): string {
  if (isSafeRedirectPath(target)) {
    return (target as string).trim();
  }
  return defaultPath;
}


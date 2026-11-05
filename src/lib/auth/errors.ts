/**
 * Formats authentication error messages for friendly, secure user display.
 * Prevents user enumeration and handles rate-limits smoothly.
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status: unknown }).status
      : undefined;

  // Rate limits
  if (
    status === 429 ||
    /rate limit/i.test(message) ||
    /too many requests/i.test(message) ||
    /over_email_send_rate_limit/i.test(message)
  ) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  // Invalid login credentials
  if (
    /invalid login credentials/i.test(message) ||
    /invalid_grant/i.test(message) ||
    /invalid email or password/i.test(message)
  ) {
    return 'Incorrect email or password. Please try again.';
  }

  // Account already exists
  if (
    /user already registered/i.test(message) ||
    /already exists/i.test(message) ||
    /email address is already registered/i.test(message)
  ) {
    return 'An account with this email already exists. Try signing in.';
  }

  // Unconfirmed email
  if (/email not confirmed/i.test(message)) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  // Password requirements
  if (/password should be at least/i.test(message) || /password is too short/i.test(message)) {
    return 'Password must be at least 8 characters long.';
  }

  // Expired / invalid recovery token
  if (/token has expired/i.test(message) || /otp_expired/i.test(message)) {
    return 'This password reset link has expired. Please request a new one.';
  }

  // Discord OAuth canceled / denied
  if (/access_denied/i.test(message) || /user denied/i.test(message)) {
    return 'Discord sign-in was canceled or denied.';
  }

  return message || 'Authentication failed. Please check your connection and try again.';
}


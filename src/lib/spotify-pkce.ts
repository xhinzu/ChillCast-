export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

// Generate cryptographically random code verifier
export function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

// Compute SHA-256 code challenge for PKCE
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function redirectToSpotifyAuthorize(clientId: string, redirectUri: string) {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  clientId: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) {
    throw new Error('PKCE code verifier not found in session storage.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spotify token exchange error: ${errText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  };

  sessionStorage.removeItem('spotify_code_verifier');
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

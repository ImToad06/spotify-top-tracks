const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '60eb550be4414dc4a11da33cba2faeb7';
const redirectUri = import.meta.env.VITE_REDIRECT_URI || 'http://127.0.0.1:5173';
const authEndpoint = 'https://accounts.spotify.com/authorize';
const tokenEndpoint = 'https://accounts.spotify.com/api/token';
const scopes = ['user-top-read'];

// PKCE Helper Functions
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const redirectToSpotifyAuth = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  window.localStorage.setItem('code_verifier', codeVerifier);

  const authUrl = new URL(authEndpoint);
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  window.location.href = authUrl.toString();
};

export const handleAuthRedirect = async (): Promise<string | null> => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) return null;

  const codeVerifier = window.localStorage.getItem('code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  };

  const response = await fetch(tokenEndpoint, payload);
  const data = await response.json();

  if (data.access_token) {
    // Clear the code and state from the URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return data.access_token;
  }

  return null;
};

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  external_urls: { spotify: string };
}

export const getTopTracks = async (accessToken: string): Promise<SpotifyTrack[]> => {
  const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch top tracks');
  }

  const data = await response.json();
  return data.items;
};

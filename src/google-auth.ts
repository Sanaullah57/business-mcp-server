const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/";
const YOUTUBE_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";

export interface GoogleAuthProps {
  googleUserId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number; // epoch ms
}

export interface GoogleClientEnv {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

/**
 * Returns a valid Google access token for this request, refreshing it via the
 * stored refresh_token if the current one is expired/near-expiry. The refresh
 * token itself is never returned or logged.
 */
export async function getFreshAccessToken(
  props: GoogleAuthProps,
  env: GoogleClientEnv,
): Promise<string> {
  const SAFETY_BUFFER_MS = 60_000;
  if (props.accessToken && props.accessTokenExpiresAt > Date.now() + SAFETY_BUFFER_MS) {
    return props.accessToken;
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: props.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Could not refresh the Google access token (${res.status}). You may need to reconnect this MCP server to Google. Details: ${text}`,
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

async function googleGet(baseUrl: string, path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(path ? `${baseUrl}${path}` : baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google API request failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/** Read-only call to the YouTube Data API v3. */
export function youtubeApiFetch(
  resource: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<unknown> {
  return googleGet(YOUTUBE_API_BASE, resource, accessToken, params);
}

/** Read-only call to the YouTube Analytics API v2 (reports). */
export function youtubeAnalyticsFetch(
  accessToken: string,
  params: Record<string, string>,
): Promise<unknown> {
  return googleGet(YOUTUBE_ANALYTICS_URL, "", accessToken, params);
}

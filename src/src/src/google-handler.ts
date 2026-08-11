import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { signPayload, verifyPayload } from "./security";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Least-privilege, read-only scopes only. Do not add write/upload/delete scopes here.
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

const APPROVED_COOKIE = "mcp_approved_clients";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
}

function getCookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function renderApprovalPage(clientName: string, continueUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect to Business MCP Server</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:480px;margin:64px auto;padding:0 24px;color:#1a1a1a;background:#fafafa}
  .card{border:1px solid #e2e2e2;border-radius:12px;padding:32px;background:#fff}
  h1{font-size:20px;margin-top:0}
  p{color:#555;line-height:1.5}
  a.btn{display:inline-block;margin-top:20px;background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600}
  .scopes{background:#f4f4f4;border-radius:8px;padding:12px 16px;font-size:13px;color:#444;margin-top:18px}
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(clientName)} wants to connect</h1>
    <p>This will let <strong>${escapeHtml(clientName)}</strong> connect to your <strong>Business MCP Server</strong>. You will be asked to sign in with Google to grant <strong>read-only</strong> access to your YouTube channel (channel info, videos, playlists, and analytics).</p>
    <div class="scopes">Nothing is written, deleted, or published. Your Google password is never seen by this server &mdash; only a token issued by Google.</div>
    <a class="btn" href="${continueUrl}">Continue with Google</a>
  </div>
</body>
</html>`;
}

async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  let oauthReqInfo: AuthRequest;
  try {
    oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (err) {
    return new Response(`Invalid authorization request: ${(err as Error).message}`, { status: 400 });
  }

  const clientInfo = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);
  const clientName =
    (clientInfo as { clientName?: string; client_name?: string } | null)?.clientName ??
    (clientInfo as { clientName?: string; client_name?: string } | null)?.client_name ??
    oauthReqInfo.clientId;

  const redirectUri = new URL("/callback", request.url).toString();
  const state = await signPayload({ oauthReqInfo, iat: Date.now() }, env.COOKIE_ENCRYPTION_KEY);

  const googleUrl = new URL(GOOGLE_AUTH_URL);
  googleUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", GOOGLE_SCOPES);
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "consent");
  googleUrl.searchParams.set("state", state);

  // Skip the approval page if this browser already approved this exact MCP client.
  const approvedCookie = getCookieValue(request, APPROVED_COOKIE);
  if (approvedCookie) {
    const approved = await verifyPayload<string[]>(approvedCookie, env.COOKIE_ENCRYPTION_KEY);
    if (approved?.includes(oauthReqInfo.clientId)) {
      return Response.redirect(googleUrl.toString(), 302);
    }
  }

  const html = renderApprovalPage(String(clientName), googleUrl.toString());
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Google sign-in was cancelled or failed: ${escapeHtml(error)}`, { status: 400 });
  }
  if (!code || !state) {
    return new Response("Missing 'code' or 'state' on Google callback.", { status: 400 });
  }

  const statePayload = await verifyPayload<{ oauthReqInfo: AuthRequest; iat: number }>(
    state,
    env.COOKIE_ENCRYPTION_KEY,
  );
  if (!statePayload || Date.now() - statePayload.iat > STATE_MAX_AGE_MS) {
    return new Response("This authorization link expired or is invalid. Please try connecting again.", {
      status: 400,
    });
  }
  const oauthReqInfo = statePayload.oauthReqInfo;

  const redirectUri = new URL("/callback", request.url).toString();
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Google token exchange failed (${tokenRes.status}): ${text}`, { status: 502 });
  }
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  if (!tokens.refresh_token) {
    return new Response(
      "Google did not return a refresh token (this can happen on repeat authorizations). " +
        "Go to https://myaccount.google.com/permissions, remove access for this app, then try connecting again.",
      { status: 400 },
    );
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    return new Response("Failed to fetch Google account info after sign-in.", { status: 502 });
  }
  const user = (await userRes.json()) as GoogleUserInfo;

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: user.sub,
    metadata: { label: user.email },
    scope: oauthReqInfo.scope,
    props: {
      googleUserId: user.sub,
      email: user.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    },
  });

  // Remember this client was approved on this browser so future connects skip the consent page.
  const approvedCookie = getCookieValue(request, APPROVED_COOKIE);
  let approved: string[] = [];
  if (approvedCookie) {
    approved = (await verifyPayload<string[]>(approvedCookie, env.COOKIE_ENCRYPTION_KEY)) ?? [];
  }
  if (!approved.includes(oauthReqInfo.clientId)) approved.push(oauthReqInfo.clientId);
  const newCookie = await signPayload(approved, env.COOKIE_ENCRYPTION_KEY);

  const headers = new Headers({ Location: redirectTo });
  headers.append(
    "Set-Cookie",
    `${APPROVED_COOKIE}=${encodeURIComponent(newCookie)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ONE_YEAR_SECONDS}`,
  );
  return new Response(null, { status: 302, headers });
}

const googleHandler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/authorize") return handleAuthorize(request, env);
    if (pathname === "/callback") return handleCallback(request, env);
    return new Response("Not found", { status: 404 });
  },
};

export default googleHandler;

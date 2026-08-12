# Business MCP Server — Phase 1 (YouTube, read-only)

A remote Model Context Protocol (MCP) server running on Cloudflare Workers, connecting Claude to a Google/YouTube account for **read-only** business intelligence. This is the foundation of a larger Business MCP Server that will later add more integrations — YouTube is the first one.

## Architecture

- **MCP endpoint:** `/mcp`
- **MCP client auth:** `@cloudflare/workers-oauth-provider` (OAuth server role, issues tokens to Claude)
- **Upstream auth:** Google OAuth (this server acts as an OAuth *client* to Google)
- **Storage:** Cloudflare KV (`OAUTH_KV`) for OAuth grants/state

## Phase 1 scope

Read-only YouTube access only. No uploads, edits, deletes, or publishing — and no other services (Shopify/Amazon/Facebook/Instagram) yet.

**Google scopes used:**
- `openid`
- `email`
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

**MCP tools:**
| Tool | Purpose |
|---|---|
| `business_server_status` | Server status, version, connected-service summary |
| `youtube_get_channel_info` | Channel profile + stats |
| `youtube_list_videos` | List uploaded videos |
| `youtube_get_video_details` | Details for specific video IDs |
| `youtube_list_playlists` | List playlists |
| `youtube_get_playlist_items` | List videos in a playlist |
| `youtube_get_channel_analytics` | Views, watch time, subs, likes, comments, shares over a date range |

## Repository structure


## Local development

Copy `.dev.vars.example` to `.dev.vars` and fill in real values for local `wrangler dev` only — never commit `.dev.vars`.

## Deployment

Deployed via Cloudflare Workers Builds (GitHub integration) — connect this repo in the Cloudflare dashboard under **Workers & Pages → Create → Import a repository**. Wrangler config (`wrangler.jsonc`) is auto-detected.

Manual deploy (if using a terminal):


## Required Cloudflare Worker secrets

Set these in **Worker → Settings → Variables and Secrets** (type: *Secret*), never in source:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `COOKIE_ENCRYPTION_KEY` — any long random string (e.g. `openssl rand -hex 32`)

## Google Cloud setup

1. console.cloud.google.com → create/select project.
2. Enable **YouTube Data API v3** and **YouTube Analytics API**.
3. **OAuth consent screen** → External → add the 4 scopes above.
4. Add your own Google account as a **test user**.
5. **Credentials → Create OAuth client ID** → Web application.
6. Authorized redirect URI — **must exactly match your real deployed Worker URL**, not a placeholder:
   `https://<your-worker>.<subdomain>.workers.dev/callback`

## Testing

Visiting `/mcp` unauthenticated should return an auth challenge (not a 500) — that confirms the endpoint is correctly protected. Full connection happens from Claude.ai → Settings → Connectors → Add custom connector → paste the `/mcp` URL.

## Security notes

- OAuth state passed to Google is HMAC-signed and time-limited (10 min).
- The "already approved" browser cookie is HMAC-signed, `HttpOnly`, `Secure`, `SameSite=Lax`.
- Google refresh/access tokens are never returned to the MCP client or logged — they live only in the OAuth provider's encrypted grant storage, retrievable only via the opaque bearer token issued to the authenticated MCP client.
- No write/delete/publish scopes requested anywhere in this phase.

## Current limitations

- Single Google account per deployment (no multi-account switching yet).
- No persistent business database yet (KV is used only for OAuth state, not business data).
- Google OAuth consent screen in "Testing" mode may require periodic re-authorization.

## Future phases

- Phase 2: additional Google/business data
- Phase 3: Facebook/Instagram
- Phase 4: Shopify
- Phase 5: Amazon Seller Central / SP-API
- Phase 6: unified natural-language business manager across all integrations

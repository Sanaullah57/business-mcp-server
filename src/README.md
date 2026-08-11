# Business MCP Server — Phase 1 (YouTube, read-only)

Remote MCP server on Cloudflare Workers. Endpoint: `/mcp`.
Auth: OAuthProvider (MCP-client-facing) wrapping Google OAuth (upstream, for YouTube).

Read-only scopes only:
- openid
- email
- https://www.googleapis.com/auth/youtube.readonly
- https://www.googleapis.com/auth/yt-analytics.readonly

Tools: `business_server_status`, `youtube_get_channel_info`, `youtube_list_videos`,
`youtube_get_video_details`, `youtube_list_playlists`, `youtube_get_playlist_items`,
`youtube_get_channel_analytics`.

## 1. Install

```
npm install agents @modelcontextprotocol/server@2.0.0 zod @cloudflare/workers-oauth-provider
npm install -D wrangler typescript @cloudflare/workers-types
```

## 2. Type-check

```
npm run typecheck
```

## 3. Deploy (first time — no secrets needed yet, it will just 401 until step 5)

```
npm run deploy
```

Wrangler will print your live URL, e.g. `https://business-mcp-server.<your-subdomain>.workers.dev`.
Your MCP endpoint is that URL + `/mcp`.

## 4. Create the Google OAuth Client

See the "Google Cloud setup" section from Claude's chat message for exact steps.
The redirect URI you register in Google must be exactly:
`https://business-mcp-server.<your-subdomain>.workers.dev/callback`

## 5. Set Worker secrets (never hard-code these)

```
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

`COOKIE_ENCRYPTION_KEY` can be any long random string, e.g. generate one with
`openssl rand -hex 32` or a password manager.

## 6. Verify

Visit `https://<your-worker-url>/mcp` in a browser — a 401 / auth-challenge response
means it's working correctly (the endpoint is protected, as intended). A bare 500 or
"script not found" means something is wrong — capture the exact error.

## 7. Connect to Claude.ai

Claude.ai → Settings → Connectors → Add custom connector → paste the `/mcp` URL →
follow the consent + Google sign-in prompts.

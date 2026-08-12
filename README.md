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

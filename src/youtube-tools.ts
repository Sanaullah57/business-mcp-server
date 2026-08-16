import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getMcpAuthContext } from "agents/mcp/server";
import {
  getFreshAccessToken,
  youtubeApiFetch,
  youtubeAnalyticsFetch,
  type GoogleAuthProps,
  type GoogleClientEnv,
} from "./google-auth";
import { getBusinessOverview } from "./agents/orchestrator";

const SERVER_NAME = "business-mcp-server";
const SERVER_VERSION = "1.0.0";

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function currentGoogleProps(): Partial<GoogleAuthProps> | undefined {
  return getMcpAuthContext()?.props as
    | Partial<GoogleAuthProps>
    | undefined;
}

function requireGoogleAuth(): GoogleAuthProps {
  const props = currentGoogleProps();

  if (!props?.refreshToken || !props.accessToken) {
    throw new Error(
      "Not connected to a Google/YouTube account. Reconnect this MCP server and complete the 'Continue with Google' step.",
    );
  }

  return props as GoogleAuthProps;
}

/**
 * Builds a fresh MCP server instance for a single request.
 * `env` is closed over from the Worker's fetch() call.
 */
export function createServer(env: GoogleClientEnv) {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    "business_server_status",
    {
      description:
        "Return the Business MCP Server status, version, current phase, and which upstream business services are connected. Read-only, no arguments.",
      inputSchema: {},
    },
    async () => {
      const props = currentGoogleProps();
      const youtubeConnected = Boolean(props?.refreshToken);

      return jsonContent({
        status: "ok",
        server: SERVER_NAME,
        version: SERVER_VERSION,
        phase: "Phase 1 — YouTube (read-only)",
        connectedServices: {
          youtube: youtubeConnected
            ? {
                connected: true,
                account: props?.email ?? "unknown",
              }
            : {
                connected: false,
              },

          facebook: {
            connected: false,
            note: "Planned Phase 3",
          },

          instagram: {
            connected: false,
            note: "Planned Phase 3",
          },

          shopify: {
            connected: false,
            note: "Planned Phase 4",
          },

          amazon: {
            connected: false,
            note: "Planned Phase 5",
          },
        },
        timestamp: new Date().toISOString(),
      });
    },
  );

  /**
   * Business AI Manager overview.
   *
   * Read-only.
   * Does not execute any business action.
   * Currently reports connection status for the available integrations.
   */
  server.registerTool(
    "business_get_overview",
    {
      description:
        "Get the current cross-integration business overview, including connection status for YouTube, Amazon, Shopify, and Meta. Read-only. Does not execute any business action.",
      inputSchema: {},
    },
    async () => {
      const props = currentGoogleProps();

      return jsonContent(
        getBusinessOverview(Boolean(props?.refreshToken)),
      );
    },
  );

  server.registerTool(
    "youtube_get_channel_info",
    {
      description:
        "Get the authenticated user's YouTube channel profile: title, description, subscriber/view/video counts, and the uploads playlist ID. Read-only.",
      inputSchema: {},
    },
    async () => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const data = await youtubeApiFetch("channels", token, {
        part: "snippet,statistics,contentDetails",
        mine: "true",
      });

      return jsonContent(data);
    },
  );

  server.registerTool(
    "youtube_list_videos",
    {
      description:
        "List the authenticated user's uploaded YouTube videos, most recent first. Read-only.",
      inputSchema: {
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Number of videos to return (1-50, default 10)"),

        pageToken: z
          .string()
          .optional()
          .describe("Pagination token from a previous call"),
      },
    },
    async ({ maxResults, pageToken }) => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const channelData = (await youtubeApiFetch("channels", token, {
        part: "contentDetails",
        mine: "true",
      })) as {
        items?: Array<{
          contentDetails?: {
            relatedPlaylists?: {
              uploads?: string;
            };
          };
        }>;
      };

      const uploadsPlaylistId =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return jsonContent({
          items: [],
          note: "No uploads playlist found for this channel.",
        });
      }

      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: String(maxResults ?? 10),
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const data = await youtubeApiFetch(
        "playlistItems",
        token,
        params,
      );

      return jsonContent(data);
    },
  );

  server.registerTool(
    "youtube_get_video_details",
    {
      description:
        "Get snippet, statistics, content details, and status for one or more YouTube video IDs. Read-only.",
      inputSchema: {
        videoIds: z
          .array(z.string())
          .min(1)
          .max(50)
          .describe("YouTube video IDs to look up"),
      },
    },
    async ({ videoIds }) => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const data = await youtubeApiFetch("videos", token, {
        part: "snippet,statistics,contentDetails,status",
        id: videoIds.join(","),
      });

      return jsonContent(data);
    },
  );

  server.registerTool(
    "youtube_list_playlists",
    {
      description:
        "List the authenticated user's YouTube playlists. Read-only.",
      inputSchema: {
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Number of playlists to return (1-50, default 25)"),

        pageToken: z.string().optional(),
      },
    },
    async ({ maxResults, pageToken }) => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        mine: "true",
        maxResults: String(maxResults ?? 25),
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const data = await youtubeApiFetch(
        "playlists",
        token,
        params,
      );

      return jsonContent(data);
    },
  );

  server.registerTool(
    "youtube_get_playlist_items",
    {
      description:
        "List the videos inside a specific YouTube playlist. Read-only.",
      inputSchema: {
        playlistId: z
          .string()
          .describe("The YouTube playlist ID"),

        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional(),

        pageToken: z.string().optional(),
      },
    },
    async ({ playlistId, maxResults, pageToken }) => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: String(maxResults ?? 25),
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const data = await youtubeApiFetch(
        "playlistItems",
        token,
        params,
      );

      return jsonContent(data);
    },
  );

  server.registerTool(
    "youtube_get_channel_analytics",
    {
      description:
        "Get YouTube Analytics for the authenticated channel over a date range: views, watch time, subscribers gained/lost, likes, comments, shares. Read-only.",
      inputSchema: {
        startDate: z
          .string()
          .optional()
          .describe("YYYY-MM-DD, defaults to 28 days ago"),

        endDate: z
          .string()
          .optional()
          .describe("YYYY-MM-DD, defaults to today"),

        metrics: z
          .string()
          .optional()
          .describe(
            "Comma-separated metrics, default 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares'",
          ),

        dimensions: z
          .string()
          .optional()
          .describe(
            "Comma-separated dimensions, e.g. 'day'",
          ),
      },
    },
    async ({
      startDate,
      endDate,
      metrics,
      dimensions,
    }) => {
      const props = requireGoogleAuth();
      const token = await getFreshAccessToken(props, env);

      const end =
        endDate ??
        new Date().toISOString().slice(0, 10);

      const start =
        startDate ??
        new Date(
          Date.now() - 28 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .slice(0, 10);

      const params: Record<string, string> = {
        ids: "channel==MINE",
        startDate: start,
        endDate: end,

        metrics:
          metrics ??
          "views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares",
      };

      if (dimensions) {
        params.dimensions = dimensions;
      }

      const data = await youtubeAnalyticsFetch(
        token,
        params,
      );

      return jsonContent(data);
    },
  );

  return server;
    }

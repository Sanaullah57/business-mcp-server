/**
 * Core permission/risk model for the future Business AI Manager.
 * Pure logic — no integrations, no credentials, no side effects.
 * This is the foundation every future tool (Amazon, Shopify, Meta, etc.)
 * will declare itself against before it's allowed to execute anything.
 */

export type RiskLevel = "READ_ONLY" | "LOW_RISK" | "REQUIRES_APPROVAL" | "HIGH_RISK";

export interface ToolPermissionMetadata {
  toolName: string;
  integration: string; // e.g. "youtube", "amazon", "shopify", "meta", "business"
  riskLevel: RiskLevel;
  isWrite: boolean;
  reversible: boolean;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  integration: string;
  riskLevel: RiskLevel;
  requestedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  parameters: Record<string, unknown>;
  reason: string;
  estimatedImpact?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  decidedAt?: string;
}

/**
 * Central rule: only READ_ONLY and LOW_RISK tools may execute without
 * an approval record. Everything else must have a matching APPROVED
 * ApprovalRequest before the tool layer is allowed to call it.
 */
export function requiresApproval(risk: RiskLevel): boolean {
  return risk === "REQUIRES_APPROVAL" || risk === "HIGH_RISK";
}

/**
 * Every current tool's declared permission metadata.
 * This is the single source of truth — nothing "requires approval"
 * by convention alone; it must be listed here.
 */
export const TOOL_PERMISSIONS: Record<string, ToolPermissionMetadata> = {
  business_server_status: {
    toolName: "business_server_status",
    integration: "business",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "Server status and connected-service summary.",
  },
  youtube_get_channel_info: {
    toolName: "youtube_get_channel_info",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "YouTube channel profile and stats.",
  },
  youtube_list_videos: {
    toolName: "youtube_list_videos",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "List uploaded videos.",
  },
  youtube_get_video_details: {
    toolName: "youtube_get_video_details",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "Details for specific video IDs.",
  },
  youtube_list_playlists: {
    toolName: "youtube_list_playlists",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "List playlists.",
  },
  youtube_get_playlist_items: {
    toolName: "youtube_get_playlist_items",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "List videos in a playlist.",
  },
  youtube_get_channel_analytics: {
    toolName: "youtube_get_channel_analytics",
    integration: "youtube",
    riskLevel: "READ_ONLY",
    isWrite: false,
    reversible: true,
    description: "Channel analytics over a date range.",
  },
};

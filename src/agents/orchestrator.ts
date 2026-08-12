import { amazonAdapter } from "../integrations/amazon/adapter"; // see note below
import { shopifyAdapter } from "../integrations/shopify/adapter";
import { metaAdapter } from "../integrations/meta/adapter";

export interface BusinessOverview {
  youtube: { status: "NOT_CONNECTED" | "CONNECTED"; note: string };
  amazon: { status: "NOT_CONNECTED"; note: string };
  shopify: { status: "NOT_CONNECTED"; note: string };
  meta: { status: "NOT_CONNECTED"; note: string };
  generatedAt: string;
}

/**
 * Aggregates connection status across integrations. Deliberately does NOT
 * call any live API here — that belongs in each integration's own tools.
 * `youtubeConnected` is passed in by the caller (from real MCP auth context),
 * since this module has no access to per-request auth state itself.
 */
export function getBusinessOverview(youtubeConnected: boolean): BusinessOverview {
  return {
    youtube: {
      status: youtubeConnected ? "CONNECTED" : "NOT_CONNECTED",
      note: youtubeConnected ? "Signed in." : "Not authorized yet.",
    },
    amazon: { status: "NOT_CONNECTED", note: "Requires Amazon Developer + LWA + SP-API authorization." },
    shopify: { status: "NOT_CONNECTED", note: "Requires a registered Shopify app + store access token." },
    meta: { status: "NOT_CONNECTED", note: "Requires Meta Developer app + Business verification." },
    generatedAt: new Date().toISOString(),
  };
}

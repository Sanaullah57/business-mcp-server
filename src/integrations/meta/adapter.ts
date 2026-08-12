/**
 * Meta (Facebook/Instagram) adapter — INTERFACE ONLY. Status: NOT_CONNECTED.
 * Requires: a Meta Developer app, Business verification, Page/Instagram
 * Business account linkage, and Graph API OAuth. None of this exists yet.
 */
export interface MetaAdapter {
  readonly status: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  getPageInsights?(pageId: string): Promise<unknown>;
  getInstagramInsights?(igAccountId: string): Promise<unknown>;
}

export const metaAdapter: MetaAdapter = {
  status: "NOT_CONNECTED",
};

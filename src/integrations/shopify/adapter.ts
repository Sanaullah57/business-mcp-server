/**
 * Shopify adapter — INTERFACE ONLY. Status: NOT_CONNECTED.
 * Requires: a registered Shopify custom/public app, store URL, Admin API
 * access token (or OAuth for a public app). None of this exists yet.
 */
export interface ShopifyAdapter {
  readonly status: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  getOrders?(params: { createdAfter?: string; limit?: number }): Promise<unknown>;
  getInventory?(): Promise<unknown>;
  getProducts?(): Promise<unknown>;
}

export const shopifyAdapter: ShopifyAdapter = {
  status: "NOT_CONNECTED",
};

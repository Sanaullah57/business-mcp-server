export interface AmazonAdapter {
  readonly status: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  getOrders?(params: { createdAfter?: string; maxResults?: number }): Promise<unknown>;
  getInventory?(): Promise<unknown>;
  getListings?(): Promise<unknown>;
}

export const amazonAdapter: AmazonAdapter = {
  status: "NOT_CONNECTED",
};

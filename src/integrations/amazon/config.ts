/**
 * Amazon SP-API configuration contract. Defines what credentials/config
 * will eventually be required, without assuming they exist. Populate
 * only once you've completed Amazon Developer registration + LWA + SP-API
 * self-authorization (see README "Amazon SP-API prerequisites").
 */
export interface AmazonConfig {
  lwaClientId: string;
  lwaClientSecret: string;
  refreshToken: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  sellerId: string;
  marketplaceIds: string[]; // e.g. ["ATVPDKIKX0DER"] for Amazon.com
  region: "NA" | "EU" | "FE";
}

export interface AmazonEnv {
  AMAZON_LWA_CLIENT_ID?: string;
  AMAZON_LWA_CLIENT_SECRET?: string;
  AMAZON_REFRESH_TOKEN?: string;
  AMAZON_AWS_ACCESS_KEY_ID?: string;
  AMAZON_AWS_SECRET_ACCESS_KEY?: string;
  AMAZON_SELLER_ID?: string;
}

/** True only when every required secret is actually present. Never assumes. */
export function isAmazonConfigured(env: AmazonEnv): boolean {
  return Boolean(
    env.AMAZON_LWA_CLIENT_ID &&
      env.AMAZON_LWA_CLIENT_SECRET &&
      env.AMAZON_REFRESH_TOKEN &&
      env.AMAZON_AWS_ACCESS_KEY_ID &&
      env.AMAZON_AWS_SECRET_ACCESS_KEY &&
      env.AMAZON_SELLER_ID,
  );
}

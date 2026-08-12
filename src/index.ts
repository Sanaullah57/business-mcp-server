import { OAuthProvider, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import googleHandler from "./google-handler";
import { createServer } from "./youtube-tools";

export interface Env {
  OAUTH_KV: KVNamespace;
  BUSINESS_DB: D1Database;
  OAUTH_PROVIDER: OAuthHelpers;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
}

/**
 * The API handler behind the protected "/mcp" route.
 * We build the stateless MCP handler fresh on every call so the tool
 * factory (createServer) can close over the real per-request `env`
 * (the createMcpHandler factory itself only receives protocol context,
 * not `env` — see Cloudflare's MCP handler API docs).
 */
const apiHandler: ExportedHandler<Env> = {
  fetch(request, env, ctx) {
    return createMcpHandler(() => createServer(env))(request, env, ctx);
  },
};

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: googleHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

/**
 * Small HMAC-SHA256 sign/verify helpers built on the Workers-native Web Crypto API.
 * Used to:
 *  - sign the OAuth "state" we pass to Google, so /callback can trust it came from us
 *  - sign a cookie that remembers which MCP clients this browser already approved
 *
 * No secrets are ever embedded in the signed payload's *visible* content beyond
 * what we intentionally put there (OAuth request info / a list of client ids).
 */

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signPayload(payload: unknown, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json));
  return `${btoa(json)}.${toBase64Url(sig)}`;
}

export async function verifyPayload<T = unknown>(token: string, secret: string): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const json = atob(payloadB64);
    const key = await importHmacKey(secret);
    const expectedSig = toBase64Url(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json)),
    );
    if (expectedSig !== sigB64) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

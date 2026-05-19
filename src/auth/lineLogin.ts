// LINE Login OAuth 2.0 flow with PKCE
//
// Architecture (production-grade):
//   1. App opens browser to LINE auth URL with redirect_uri = our HTTPS callback
//   2. User logs in via LINE
//   3. LINE redirects browser to https://api.aiklaotrip.com/api/mobile/oauth/callback?code=...
//   4. Backend returns HTML that triggers aiklao://auth/callback?code=...
//   5. Browser launches app via custom scheme
//   6. WebBrowser watches for aiklao:// scheme → captures result
//   7. App exchanges code for id_token via LINE token endpoint
//
// Why HTTPS callback + custom scheme?
//   - LINE OAuth requires HTTPS callback (custom schemes rejected by LINE strict matching)
//   - Custom scheme needed for browser → app deep linking
//   - Our backend bridges the two

import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const LINE_AUTH_ENDPOINT = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_ENDPOINT = "https://api.line.me/oauth2/v2.1/token";

// Our backend's OAuth callback handler (registered in LINE Console as Web callback)
const HTTPS_CALLBACK_URL =
  "https://api.aiklaotrip.com/api/mobile/oauth/callback";

// Custom scheme that backend redirects to → captured by WebBrowser
const APP_RETURN_URL = "aiklao://auth/callback";

export interface LineLoginResult {
  idToken: string | null;
  accessToken: string | null;
}

/**
 * Generate random hex string for state/nonce/PKCE
 */
async function randomHex(bytes: number): Promise<string> {
  const buf = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA256 hash → base64url (for PKCE code_challenge)
 */
async function sha256Base64Url(input: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  // base64 → base64url
  return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Run LINE Login OAuth 2.0 flow
 * Returns id_token (JWT signed by LINE) — backend verifies it
 */
export async function lineLogin(): Promise<LineLoginResult> {
  const channelId = Constants.expoConfig?.extra?.lineChannelId as
    | string
    | undefined;
  if (!channelId || channelId.startsWith("REPLACE_")) {
    throw new Error(
      "LINE channelId not set in app.json (extra.lineChannelId). See PHASE_5.1.md"
    );
  }

  // 1. Generate PKCE + state + nonce
  const state = await randomHex(16);
  const nonce = await randomHex(16);
  const codeVerifier = await randomHex(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  // 2. Build LINE authorize URL
  const authUrl = new URL(LINE_AUTH_ENDPOINT);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", channelId);
  authUrl.searchParams.set("redirect_uri", HTTPS_CALLBACK_URL);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("scope", "profile openid");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("bot_prompt", "normal");

  // 3. Open in-app browser, watch for aiklao:// scheme to close
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl.toString(),
    APP_RETURN_URL
  );

  if (result.type !== "success" || !result.url) {
    return { idToken: null, accessToken: null };
  }

  // 4. Parse the return URL: aiklao://auth/callback?code=...&state=...
  let returnUrl: URL;
  try {
    returnUrl = new URL(result.url);
  } catch {
    throw new Error("Invalid return URL");
  }

  const errorParam = returnUrl.searchParams.get("error");
  if (errorParam) {
    const desc = returnUrl.searchParams.get("error_description") || "";
    throw new Error(`LINE OAuth error: ${errorParam} ${desc}`);
  }

  const code = returnUrl.searchParams.get("code");
  const returnedState = returnUrl.searchParams.get("state");

  if (!code) {
    return { idToken: null, accessToken: null };
  }

  if (returnedState !== state) {
    throw new Error("State mismatch — possible CSRF attack");
  }

  // 5. Exchange code for id_token via LINE token endpoint
  // NOTE: redirect_uri must match exactly what was used in auth request
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: HTTPS_CALLBACK_URL,
    client_id: channelId,
    code_verifier: codeVerifier,
  });

  const tokenResp = await fetch(LINE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    throw new Error(`LINE token exchange failed: ${tokenResp.status} ${text}`);
  }

  const tokenJson = (await tokenResp.json()) as {
    access_token: string;
    id_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    idToken: tokenJson.id_token,
    accessToken: tokenJson.access_token,
  };
}
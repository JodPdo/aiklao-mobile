// src/services/inviteDeepLink.ts
// Pure helpers for the invite deep-link flow: URL → token parsing and the
// pending-token queue (used when a link arrives before the user is authed).

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'pending_invite_token';

/**
 * Extract an invite token from a deep link. Handles:
 *   aiklao://invite/<token>
 *   https://aiklaotrip.com/invite/<token>   (universal link)
 *   any URL with ?invite=<token>            (fallback / LIFF-style)
 * Returns null for non-invite URLs. Does NOT validate token shape — the
 * backend is the source of truth (a malformed token just 404s on redeem).
 */
export function parseInviteToken(url: string | null | undefined): string | null {
  if (!url) return null;
  const pathMatch = url.match(/(?:aiklao:\/\/|https?:\/\/[^/]+\/)invite\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim() || null;
  const queryMatch = url.match(/[?&]invite=([^&#]+)/i);
  if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim() || null;
  return null;
}

export async function getPendingToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export async function setPendingToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, token);
  } catch {
    /* non-fatal — in-memory state still drives the immediate attempt */
  }
}

export async function clearPendingToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    /* non-fatal */
  }
}

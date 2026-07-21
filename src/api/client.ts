import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { tokenStorage } from '@/auth/tokenStorage';

const baseURL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://api.aiklaotrip.com';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Inject JWT on each request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const jwt = await tokenStorage.getJwt();
  if (jwt) {
    config.headers.set('Authorization', `Bearer ${jwt}`);
  }
  return config;
});

// Callback set by AuthProvider to handle 401 globally
let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await tokenStorage.clear();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

// ─── Phase 6.2 SOS (backend contract: aiklao_mb_local v0.1.23) ───────────────

export interface TriggerSosBody {
  lat: number;
  lng: number;
  accuracy_m?: number;
}

export interface SosObject {
  id: string;
  tripId: string;
  userId: string;
  lat: number;
  lng: number;
  triggeredAt: string;
  pushSentCount: number;
  pushFailedCount: number;
}

/** POST /api/mobile/trips/:tripId/sos — throws err.code='ACTIVE_SOS_EXISTS' on 409. */
export async function triggerSos(tripId: string, body: TriggerSosBody): Promise<SosObject> {
  try {
    const res = await api.post<{ ok: boolean; sos: SosObject }>(
      `/api/mobile/trips/${tripId}/sos`,
      body,
    );
    return res.data.sos;
  } catch (e) {
    const err = e as AxiosError<{ code?: string; existing?: { id?: string } }>;
    if (err.response?.status === 409 && err.response.data?.code === 'ACTIVE_SOS_EXISTS') {
      const dup: any = new Error('ACTIVE_SOS_EXISTS');
      dup.code = 'ACTIVE_SOS_EXISTS';
      dup.existingId = err.response.data.existing?.id;
      throw dup;
    }
    throw e;
  }
}

/** POST /api/mobile/trips/:tripId/sos/:sosId/cancel */
export async function cancelSos(tripId: string, sosId: string): Promise<{ cancelledAt: string }> {
  const res = await api.post<{ ok: boolean; cancelledAt: string }>(
    `/api/mobile/trips/${tripId}/sos/${sosId}/cancel`,
  );
  return { cancelledAt: res.data.cancelledAt };
}

// ─── MB-5 — member self-leave (contract: MB5_LEAVE_TRIP_DESIGN.md, G1-approved) ──
// Backend package not yet landed — DO NOT wire this against a live server until
// then; this function is complete and tested against a mocked api client only.

/**
 * DELETE /api/mobile/trips/:tripId/members/me — a non-leader member leaves the
 * trip. Throws an Error with `.code` set to 'LEADER_CANNOT_LEAVE' | 'NOT_A_MEMBER'
 * | 'ALREADY_ARCHIVED' when the response matches one of those documented cases;
 * any other failure rethrows the raw AxiosError untouched (same convention as
 * triggerSos's 409/ACTIVE_SOS_EXISTS mapping above).
 */
export async function leaveTrip(tripId: string): Promise<void> {
  try {
    await api.delete(`/api/mobile/trips/${tripId}/members/me`);
  } catch (e) {
    const err = e as AxiosError<{ error?: string }>;
    const code = err.response?.data?.error;
    const status = err.response?.status;
    if (status === 403 && code === 'leader_cannot_leave') {
      throw typedError('LEADER_CANNOT_LEAVE');
    }
    if (status === 404 && code === 'not_a_member') {
      throw typedError('NOT_A_MEMBER');
    }
    if (status === 409 && code === 'already_archived') {
      throw typedError('ALREADY_ARCHIVED');
    }
    throw e;
  }
}

function typedError(code: string): Error {
  const err: any = new Error(code);
  err.code = code;
  return err;
}

// ─── Phase 6.2.5 — trip listing (active trip entry on HomeScreen) ────────────

export interface TripSummary {
  id: string;
  name: string;
  status: string;              // 'active' | 'archived' (verified — NOT 'in_progress')
  createdAt: string;
  memberCount?: number;
  isLeader?: boolean;
  lastLocationAt?: string | null;
}

/** GET /api/mobile/trips — returns all of the caller's trips (active + archived). */
export async function listTrips(): Promise<TripSummary[]> {
  const res = await api.get<{ trips: TripSummary[] }>('/api/mobile/trips');
  return res.data.trips ?? [];   // defensive: never null/undefined
}

// ─── Phase 6.4c — invite links (backend contract: aiklao_mb_local v0.1.26) ───
// NOTE: live backend uses SINGULAR paths /trips/:id/invite (create) and
// /invite/:token/join (redeem) — NOT the /invites/.../accept the design doc
// drafted. Backend is already deployed and must not change, so the client
// matches the live contract.

export interface InviteResponse {
  ok: boolean;
  token: string;
  code: string;
  link: string;
  expires_at: string;
  redeemed_count: number;
}

/** POST /api/mobile/trips/:tripId/invite — leader-only. Creates or reuses the active invite. */
export async function createInvite(tripId: string): Promise<InviteResponse> {
  const res = await api.post<InviteResponse>(`/api/mobile/trips/${tripId}/invite`, {});
  return res.data;
}

export type AcceptInviteResult =
  | { kind: 'joined'; tripId: string; tripName: string }
  | { kind: 'already'; tripId: string; tripName: string }
  | { kind: 'expired' }
  | { kind: 'notfound' }
  | { kind: 'error' };

/**
 * POST /api/mobile/invite/:token/join — redeem a token, become a member.
 * Maps the backend's status codes to a discriminated result so callers don't
 * touch axios internals (mirrors triggerSos's error-mapping style).
 */
export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  try {
    const res = await api.post<{
      ok: boolean; trip_id: string | number; trip_name: string; was_already_member: boolean;
    }>(`/api/mobile/invite/${token}/join`, {});
    const d = res.data;
    return {
      kind: d.was_already_member ? 'already' : 'joined',
      tripId: String(d.trip_id),
      tripName: d.trip_name,
    };
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status === 410) return { kind: 'expired' };
    if (status === 404) return { kind: 'notfound' };
    return { kind: 'error' };
  }
}

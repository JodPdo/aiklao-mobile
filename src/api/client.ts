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

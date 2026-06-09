// src/screens/trip/useSos.ts
// Shared SOS controller — extracted verbatim from MapScreen's Phase 6.2 logic so
// MapScreen and TripDetailScreen behave IDENTICALLY (safety feature). Pure model:
// local state + reconciliation effect + the four handlers (incl. the
// ACTIVE_SOS_EXISTS path, the no-coords guard, the immediate refetch) + the
// sosMarkers builder. All confirm/alert copy is the SAME Thai text as MapScreen.
//
// Injection:
//   - myActiveSos is matched on `user.id` (selfMember lookup by `user.lineUserId`
//     stays on the screen side, inside getCoords()).
//   - getCoords() supplies the screen's coords (selfMember.lastLocation ?? a
//     one-shot fix) + accuracyM; null means "no fix available".
//   - refetch() is the screen's trip fetcher — called immediately after
//     trigger/cancel because the 60s poll is too slow for the banner/marker.

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { triggerSos, cancelSos } from '@/api/client';
import type { SosMarker } from '@/components/LeafletMapView';
import type { StoredUser } from '@/auth/tokenStorage';
import { ActiveSos, fmtTimeHHMM } from './tripShared';

/** Coords (+ optional accuracy) for a SOS trigger. null = no fix available. */
export interface SosCoords {
  lat: number;
  lng: number;
  accuracyM?: number;
}

export interface UseSosParams {
  tripId: string;
  activeSos: ActiveSos[] | undefined;   // from TripData — single source of truth
  user: StoredUser | null;              // myActiveSos matched on user.id
  getCoords: () => SosCoords | null;    // screen: selfMember.lastLocation ?? one-shot fix
  refetch: () => void;                  // immediate trip refetch after trigger/cancel
}

export interface UseSosResult {
  mySosId: string | null;
  sosTimeHHMM: string;
  sosMarkers: SosMarker[];                          // ALL members' active SOS (markers)
  handleSosPress: () => void;                        // SosButton idle tap → confirm
  handleSosCancelPress: (sosId: string) => void;     // banner / SosButton cancel → confirm
}

export function useSos({ tripId, activeSos, user, getCoords, refetch }: UseSosParams): UseSosResult {
  const [mySosId, setMySosId] = useState<string | null>(null);
  const [sosTimeHHMM, setSosTimeHHMM] = useState<string>('');

  // My own active SOS (coercion-safe: backend userId is stringified BIGINT;
  // user.id is string but could be number after future auth changes).
  const myActiveSos = (activeSos ?? []).find(
    (s) => String(s.userId) === String(user?.id),
  ) ?? null;

  // Reconcile local SOS state with server truth whenever my active SOS changes.
  useEffect(() => {
    if (myActiveSos) {
      setMySosId(String(myActiveSos.id));
      setSosTimeHHMM(fmtTimeHHMM(myActiveSos.triggeredAt));
    } else {
      setMySosId(null);
      setSosTimeHHMM('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myActiveSos?.id]);

  // SOS markers for the map (all active SOS on this trip, not just mine)
  const sosMarkers: SosMarker[] = (activeSos ?? []).map((s) => ({
    id: String(s.id),
    lat: s.lat,
    lng: s.lng,
    name: s.displayName,
    timeHHMM: fmtTimeHHMM(s.triggeredAt),
  }));

  // ── Actual API calls (confirm UI lives in the *Press wrappers below) ──

  const handleSosConfirm = async (coords: SosCoords) => {
    try {
      const sos = await triggerSos(String(tripId), {
        lat: coords.lat,
        lng: coords.lng,
        accuracy_m: coords.accuracyM ?? undefined,
      });
      // Instant UX — optimistic local state so banner appears with no lag
      setMySosId(sos.id);
      setSosTimeHHMM(fmtTimeHHMM(sos.triggeredAt));
      // Immediate refetch so activeSos[] populates the SOS marker (60s poll too slow)
      refetch();
    } catch (e: any) {
      if (e.code === 'ACTIVE_SOS_EXISTS') {
        if (e.existingId) setMySosId(String(e.existingId));
        refetch();
        Alert.alert('SOS ส่งไปแล้ว', 'คุณมี SOS ที่ยังไม่ยกเลิกอยู่');
      } else {
        Alert.alert('ส่ง SOS ไม่สำเร็จ', e.message || 'ลองอีกครั้ง');
      }
    }
  };

  const handleSosCancel = async (sosId: string) => {
    try {
      await cancelSos(String(tripId), sosId);
      setMySosId(null);
      refetch();
    } catch (e: any) {
      Alert.alert('ยกเลิกไม่สำเร็จ', e.message || 'ลองอีกครั้ง');
    }
  };

  // ── Alert.alert wrappers (UI confirm before calling the actual API handlers) ──

  const handleSosPress = () => {
    const coords = getCoords();
    if (!coords) {
      Alert.alert('ส่ง SOS ไม่ได้', 'ยังไม่มีพิกัดของคุณในระบบ');
      return;
    }
    Alert.alert(
      '🚨 ยืนยันส่งสัญญาณ SOS?',
      'สมาชิกทุกคนในทริปจะได้รับแจ้งเตือนทันที พร้อมตำแหน่งปัจจุบันของคุณ',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ส่ง SOS', style: 'destructive', onPress: () => handleSosConfirm(coords) },
      ],
    );
  };

  const handleSosCancelPress = (sosId: string) => {
    Alert.alert(
      'ยืนยันยกเลิก SOS?',
      'สมาชิกทุกคนจะเห็นว่า SOS ของคุณถูกยกเลิก',
      [
        { text: 'ไม่', style: 'cancel' },
        { text: 'ยกเลิก SOS', style: 'destructive', onPress: () => handleSosCancel(sosId) },
      ],
    );
  };

  return { mySosId, sosTimeHHMM, sosMarkers, handleSosPress, handleSosCancelPress };
}

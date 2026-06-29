// Hook tests for useSos — the shared SOS controller used by MapScreen and
// TripDetailScreen. Covers server-state reconciliation, marker building, the
// userId/user.id string-coercion match, and the no-GPS-fix safety guard
// (must NOT fire an SOS without coordinates). Rendered with react-test-renderer.
import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { triggerSos } from '@/api/client';
import { useSos, type UseSosResult } from '../useSos';
import type { ActiveSos } from '../tripShared';

jest.mock('@/i18n', () => ({ t: (k: string) => k, currentLocale: 'en' }));
jest.mock('@/api/client', () => ({ triggerSos: jest.fn(), cancelSos: jest.fn() }));
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function renderUseSos(params: Parameters<typeof useSos>[0]) {
  const result: { current: UseSosResult } = { current: undefined as any };
  function Comp() {
    result.current = useSos(params);
    return null;
  }
  act(() => { TestRenderer.create(React.createElement(Comp)); });
  return result;
}

const sos = (over: Partial<ActiveSos> = {}): ActiveSos => ({
  id: 'sos-1',
  userId: '123',
  displayName: 'Jod',
  pictureUrl: null,
  lat: 13.7,
  lng: 100.5,
  triggeredAt: '2026-06-29T05:00:00.000Z',
  ...over,
});

afterEach(() => jest.clearAllMocks());

describe('useSos — reconciliation with server truth', () => {
  it('sets mySosId when an active SOS belongs to me', () => {
    const r = renderUseSos({
      tripId: 't1', activeSos: [sos()], user: { id: '123', lineUserId: 'U', displayName: 'Jod' } as any,
      getCoords: () => ({ lat: 1, lng: 2 }), refetch: jest.fn(),
    });
    expect(r.current.mySosId).toBe('sos-1');
    expect(r.current.sosTimeHHMM).toMatch(/^\d{2}:\d{2}$/);
  });

  it('matches by string coercion (numeric userId vs string user.id)', () => {
    const r = renderUseSos({
      tripId: 't1', activeSos: [sos({ userId: 123 as any })], user: { id: '123' } as any,
      getCoords: () => ({ lat: 1, lng: 2 }), refetch: jest.fn(),
    });
    expect(r.current.mySosId).toBe('sos-1');
  });

  it('leaves mySosId null when no SOS is mine', () => {
    const r = renderUseSos({
      tripId: 't1', activeSos: [sos({ userId: '999' })], user: { id: '123' } as any,
      getCoords: () => ({ lat: 1, lng: 2 }), refetch: jest.fn(),
    });
    expect(r.current.mySosId).toBeNull();
  });
});

describe('useSos — markers', () => {
  it('builds a marker for every active SOS, not just mine', () => {
    const r = renderUseSos({
      tripId: 't1', activeSos: [sos({ id: 'a', userId: '1' }), sos({ id: 'b', userId: '2' })],
      user: { id: '123' } as any, getCoords: () => null, refetch: jest.fn(),
    });
    expect(r.current.sosMarkers.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('useSos — no-fix safety guard', () => {
  it('does NOT trigger an SOS when there is no GPS fix', () => {
    const r = renderUseSos({
      tripId: 't1', activeSos: [], user: { id: '123' } as any,
      getCoords: () => null, refetch: jest.fn(),
    });
    act(() => { r.current.handleSosPress(); });
    expect(Alert.alert).toHaveBeenCalledWith('sos.noCoordsTitle', 'sos.noCoordsMessage');
    expect(triggerSos).not.toHaveBeenCalled();
  });
});

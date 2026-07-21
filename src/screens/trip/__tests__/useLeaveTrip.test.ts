// Hook tests for useLeaveTrip — MB-5 member self-leave (RN side, contract per
// MB5_LEAVE_TRIP_DESIGN.md). Mirrors useSos.test.ts's render-a-null-component
// convention. `leaveTrip` (api/client) is mocked throughout — do NOT wire this
// against a live server until the backend package lands.
//
// The primary regression guard Jod asked for: a successful leave must stop
// background tracking (mirrors the join->starts-tracking guard in
// useInviteDeepLink.test.tsx) — a presence-only check that handleLeaveTrip
// "exists" would pass even if the tracking-stop call were silently dropped, so
// these assertions check stopBackgroundTracking/navigate were ACTUALLY invoked.
import * as React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { leaveTrip } from '@/api/client';
import { stopBackgroundTracking } from '@/services/locationTask';
import { useLeaveTrip, type UseLeaveTripResult } from '../useLeaveTrip';

jest.mock('@/i18n', () => ({ t: (k: string) => k }));
jest.mock('@/api/client', () => ({ leaveTrip: jest.fn() }));
jest.mock('@/services/locationTask', () => ({ stopBackgroundTracking: jest.fn() }));

function renderUseLeaveTrip(params: Parameters<typeof useLeaveTrip>[0]) {
  const result: { current: UseLeaveTripResult } = { current: undefined as any };
  function Comp() {
    result.current = useLeaveTrip(params);
    return null;
  }
  act(() => { TestRenderer.create(React.createElement(Comp)); });
  return result;
}

function makeNavigation() {
  return { navigate: jest.fn() } as any;
}

/** Auto-confirms: invokes the Alert's destructive ("Leave trip") button immediately,
 *  simulating the user tapping it — mocking Alert.alert as a no-op (as some other
 *  tests in this repo do for the guard-only path) would never exercise doLeave. */
function mockAlertAutoConfirm() {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
    const confirm = buttons?.find((b) => b.style === 'destructive');
    confirm?.onPress?.();
  });
}

afterEach(() => jest.clearAllMocks());

describe('useLeaveTrip — successful leave (MB-5 regression guard)', () => {
  it('stops background tracking and navigates to the trip list when this device was sharing', async () => {
    mockAlertAutoConfirm();
    (leaveTrip as jest.Mock).mockResolvedValue(undefined);
    const navigation = makeNavigation();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: true, navigation, reloadTrip: jest.fn() });
    await act(async () => { r.current.handleLeaveTrip(); });

    expect(leaveTrip).toHaveBeenCalledWith('42');
    expect(stopBackgroundTracking).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('HomeMain');
  });

  it('does NOT call stopBackgroundTracking when this device was not sharing for this trip', async () => {
    mockAlertAutoConfirm();
    (leaveTrip as jest.Mock).mockResolvedValue(undefined);
    const navigation = makeNavigation();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: false, navigation, reloadTrip: jest.fn() });
    await act(async () => { r.current.handleLeaveTrip(); });

    expect(stopBackgroundTracking).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('HomeMain');
  });
});

describe('useLeaveTrip — confirm dialog', () => {
  it('shows a confirm dialog before calling the API — cancelling must not leave', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {}); // no auto-confirm this time
    const navigation = makeNavigation();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: true, navigation, reloadTrip: jest.fn() });
    r.current.handleLeaveTrip();

    expect(Alert.alert).toHaveBeenCalledWith(
      'trip.leaveTrip.title', 'trip.leaveTrip.message', expect.any(Array),
    );
    expect(leaveTrip).not.toHaveBeenCalled();
    expect(stopBackgroundTracking).not.toHaveBeenCalled();
  });
});

describe('useLeaveTrip — error handling', () => {
  it('on ALREADY_ARCHIVED: shows an alert and reloads the trip instead of navigating away', async () => {
    mockAlertAutoConfirm();
    const err: any = new Error('ALREADY_ARCHIVED');
    err.code = 'ALREADY_ARCHIVED';
    (leaveTrip as jest.Mock).mockRejectedValue(err);
    const navigation = makeNavigation();
    const reloadTrip = jest.fn();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: true, navigation, reloadTrip });
    await act(async () => { r.current.handleLeaveTrip(); });

    expect(stopBackgroundTracking).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(reloadTrip).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenLastCalledWith(
      'trip.leaveTrip.alreadyArchivedTitle', 'trip.leaveTrip.alreadyArchivedMessage',
    );
  });

  it('on an unexpected error: shows a generic failure alert, does not navigate or stop tracking', async () => {
    mockAlertAutoConfirm();
    (leaveTrip as jest.Mock).mockRejectedValue(new Error('network down'));
    const navigation = makeNavigation();
    const reloadTrip = jest.fn();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: true, navigation, reloadTrip });
    await act(async () => { r.current.handleLeaveTrip(); });

    expect(stopBackgroundTracking).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(reloadTrip).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenLastCalledWith('trip.leaveTrip.failed', 'network down');
  });

  it('on a 401: does nothing (the global unauthorized handler already runs) — no extra alert', async () => {
    mockAlertAutoConfirm();
    const err: any = new Error('unauthorized');
    err.response = { status: 401 };
    (leaveTrip as jest.Mock).mockRejectedValue(err);
    const navigation = makeNavigation();

    const r = renderUseLeaveTrip({ tripId: '42', isSharing: true, navigation, reloadTrip: jest.fn() });
    await act(async () => { r.current.handleLeaveTrip(); });

    // Only the confirm dialog fired — no second (failure) alert on top of it.
    expect((Alert.alert as jest.Mock).mock.calls).toHaveLength(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(stopBackgroundTracking).not.toHaveBeenCalled();
  });
});

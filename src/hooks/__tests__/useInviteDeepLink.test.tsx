// B2-6: regression test for B2-1's core fix — joining a trip via invite link must start
// location sharing. Before B2-1, useInviteDeepLink's 'joined' case never called
// startBackgroundTracking, so every member who joined through an invite link (rather than
// creating the trip) never appeared on the map. This is the first test in the repo written
// with @testing-library/react-native (installed as part of this ticket) — renderHook handles
// this hook's chained async effects (capture pending token → resolve invite → side effect)
// far more cleanly than the react-test-renderer + manual act() pattern used in useSos.test.ts.
//
// Does NOT re-test parseInviteToken/getPendingToken/setPendingToken/clearPendingToken (already
// covered in src/services/tests/inviteDeepLink*.test.ts) — those run for real here against the
// AsyncStorage mock so this test also exercises the actual integration, not just mocked calls.

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInviteDeepLink } from '../useInviteDeepLink';
import { acceptInvite } from '@/api/client';
import { startBackgroundTracking } from '@/services/locationTask';
import { setPendingToken, getPendingToken } from '@/services/inviteDeepLink';
import { useAuth } from '@/auth/AuthContext';

jest.mock('@/i18n', () => ({ t: (k: string) => k }));
jest.mock('@/api/client', () => ({ acceptInvite: jest.fn() }));
jest.mock('@/services/locationTask', () => ({ startBackgroundTracking: jest.fn() }));
jest.mock('@/services/notify', () => ({ notify: jest.fn() }));
jest.mock('@/auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(() => true) },
  navigateToTrip: jest.fn(),
}));

const mockedAcceptInvite = acceptInvite as jest.Mock;
const mockedStartTracking = startBackgroundTracking as jest.Mock;

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({ status: 'authenticated' });
});

afterEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('useInviteDeepLink — B2-1 regression: join starts location sharing', () => {
  it('calls startBackgroundTracking with the joined trip id', async () => {
    mockedAcceptInvite.mockResolvedValue({ kind: 'joined', tripId: 'trip-42', tripName: 'Test Trip' });
    await setPendingToken('tok-abc');

    renderHook(() => useInviteDeepLink());

    await waitFor(() => {
      expect(mockedStartTracking).toHaveBeenCalledWith('trip-42');
    });
  });

  it('does NOT call startBackgroundTracking on "already" (re-entry) — must not override a prior stop', async () => {
    mockedAcceptInvite.mockResolvedValue({ kind: 'already', tripId: 'trip-42', tripName: 'Test Trip' });
    await setPendingToken('tok-abc');

    renderHook(() => useInviteDeepLink());

    await waitFor(() => {
      expect(mockedAcceptInvite).toHaveBeenCalledWith('tok-abc');
    });
    expect(mockedStartTracking).not.toHaveBeenCalled();
  });

  it('soft-fails: a startBackgroundTracking rejection does not stop the token from clearing', async () => {
    mockedAcceptInvite.mockResolvedValue({ kind: 'joined', tripId: 'trip-42', tripName: 'Test Trip' });
    mockedStartTracking.mockRejectedValue(new Error('permission denied'));
    await setPendingToken('tok-abc');

    renderHook(() => useInviteDeepLink());

    await waitFor(async () => {
      expect(await getPendingToken()).toBeNull();
    });
  });

  it('does nothing while unauthenticated — waits for login before redeeming', async () => {
    (useAuth as jest.Mock).mockReturnValue({ status: 'unauthenticated' });
    mockedAcceptInvite.mockResolvedValue({ kind: 'joined', tripId: 'trip-42', tripName: 'Test Trip' });
    await setPendingToken('tok-abc');

    renderHook(() => useInviteDeepLink());

    // No waitFor to satisfy here — asserting a negative, so give pending microtasks a chance
    // to (wrongly) fire before checking.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockedAcceptInvite).not.toHaveBeenCalled();
    expect(mockedStartTracking).not.toHaveBeenCalled();
  });
});

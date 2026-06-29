// Pending-token queue tests for inviteDeepLink. AsyncStorage is provided by the
// official in-memory mock (jest.setup.js); the error paths override it per-test.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPendingToken,
  setPendingToken,
  clearPendingToken,
} from '../inviteDeepLink';

afterEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('pending invite-token queue', () => {
  it('round-trips a token through storage', async () => {
    await setPendingToken('tok-abc');
    expect(await getPendingToken()).toBe('tok-abc');
  });

  it('returns null when nothing is stored', async () => {
    expect(await getPendingToken()).toBeNull();
  });

  it('clears the stored token', async () => {
    await setPendingToken('tok-abc');
    await clearPendingToken();
    expect(await getPendingToken()).toBeNull();
  });

  it('returns null (does not throw) when storage read fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
    await expect(getPendingToken()).resolves.toBeNull();
  });

  it('swallows write errors (non-fatal)', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('boom'));
    await expect(setPendingToken('x')).resolves.toBeUndefined();
  });
});

// Round-trip + lifecycle tests for tokenStorage (auth token persistence).
// expo-secure-store is backed by an in-memory map so set/get/clear are real.
import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from '../tokenStorage';

jest.mock('expo-secure-store');

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => store.get(k) ?? null);
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (k: string, v: string) => { store.set(k, v); });
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (k: string) => { store.delete(k); });
});
afterEach(() => jest.clearAllMocks());

describe('tokenStorage — JWT & refresh round-trip', () => {
  it('stores and reads back the JWT', async () => {
    await tokenStorage.setJwt('jwt-123');
    expect(await tokenStorage.getJwt()).toBe('jwt-123');
  });
  it('stores and reads back the refresh token', async () => {
    await tokenStorage.setRefresh('refresh-xyz');
    expect(await tokenStorage.getRefresh()).toBe('refresh-xyz');
  });
  it('returns null for an unset JWT', async () => {
    expect(await tokenStorage.getJwt()).toBeNull();
  });
});

describe('tokenStorage — user serialization', () => {
  it('round-trips a user object through JSON', async () => {
    const user = { id: '7', lineUserId: 'Uxyz', displayName: 'Aekkarat' };
    await tokenStorage.setUser(user);
    expect(await tokenStorage.getUser()).toEqual(user);
  });
});

describe('tokenStorage.clear — full logout', () => {
  it('removes jwt, refresh and user', async () => {
    await tokenStorage.setJwt('a');
    await tokenStorage.setRefresh('b');
    await tokenStorage.setUser({ id: '1', lineUserId: 'U', displayName: 'x' });

    await tokenStorage.clear();

    expect(await tokenStorage.getJwt()).toBeNull();
    expect(await tokenStorage.getRefresh()).toBeNull();
    expect(await tokenStorage.getUser()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});

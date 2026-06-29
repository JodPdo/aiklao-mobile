import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from '../tokenStorage';

jest.mock('expo-secure-store');

describe('tokenStorage.getUser', () => {
    it('returns null when stored JSON is invalid', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
            '{"id":'
        );

        const user = await tokenStorage.getUser();

        expect(user).toBeNull();
    });
        it('returns the parsed user when JSON is valid', async () => {
    const u = { id: '1', lineUserId: 'Uabc', displayName: 'Jod' };
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(u));
    expect(await tokenStorage.getUser()).toEqual(u);   // object ใช้ toEqual ไม่ใช่ toBe
    });
});
import { parseInviteToken } from '../inviteDeepLink';

describe('parseInviteToken', () => {
    it('extracts token from custom scheme', () => {
    expect(
        parseInviteToken('aiklao://invite/abc123')
    ).toBe('abc123');
    });

    it('extracts token from universal link', () => {
    expect(
        parseInviteToken('https://aiklaotrip.com/invite/abc123')
        ).toBe('abc123');
    });

    it('extracts token from query parameter', () => {
        expect(
            parseInviteToken('https://foo.com?invite=abc123')
        ).toBe('abc123');
    });

    it('returns null for null', () => {
        expect(parseInviteToken(null)).toBeNull();
    });

    it('returns null for undefined', () => {
        expect(parseInviteToken(undefined)).toBeNull();
    });

    it('returns null for non invite url', () => {
        expect(
            parseInviteToken('https://aiklaotrip.com/home')
    ).toBeNull();
    });

    it('decodes encoded token', () => {
        expect(
            parseInviteToken('aiklao://invite/hello%20world')
        ).toBe('hello world');
    });
});
// Unit tests for the pure helpers in trip/tripShared.ts.
// i18n is mocked so locale-dependent helpers return their translation keys,
// keeping assertions deterministic and independent of device locale.
jest.mock('@/i18n', () => ({
  t: (key: string, _opts?: Record<string, unknown>) => key,
  currentLocale: 'en',
}));

import {
  avatarColor,
  avatarChar,
  getBatteryColor,
  isRecent,
  formatRelativeTime,
  memberStatusLabel,
  AVATAR_PALETTE,
  OFFLINE_THRESHOLD_MS,
  type Member,
} from '../tripShared';

const baseMember = (over: Partial<Member> = {}): Member => ({
  id: 'm1',
  lineUserId: 'U1',
  displayName: 'Jod',
  pictureUrl: null,
  isLeader: false,
  joinedAt: '2026-06-01T00:00:00.000Z',
  arrivedAt: null,
  lastLocation: null,
  ...over,
});

describe('getBatteryColor — power-save thresholds', () => {
  it('green at and above 50%', () => {
    expect(getBatteryColor(100)).toBe('#0F6E56');
    expect(getBatteryColor(50)).toBe('#0F6E56');
  });
  it('amber from 20% up to 49%', () => {
    expect(getBatteryColor(49)).toBe('#854F0B');
    expect(getBatteryColor(20)).toBe('#854F0B');
  });
  it('red below 20% (the auto power-save zone)', () => {
    expect(getBatteryColor(19)).toBe('#791F1F');
    expect(getBatteryColor(0)).toBe('#791F1F');
  });
});

describe('isRecent — 60s window', () => {
  const NOW = new Date('2026-06-29T12:00:00.000Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it('true for a timestamp 30s ago', () => {
    expect(isRecent(new Date(NOW - 30_000).toISOString())).toBe(true);
  });
  it('false at exactly 60s (strict less-than)', () => {
    expect(isRecent(new Date(NOW - 60_000).toISOString())).toBe(false);
  });
  it('false for a timestamp 2 min ago', () => {
    expect(isRecent(new Date(NOW - 120_000).toISOString())).toBe(false);
  });
});

describe('avatarChar', () => {
  it('returns the first character', () => expect(avatarChar('Jod')).toBe('J'));
  it('falls back to ? for empty string', () => expect(avatarChar('')).toBe('?'));
});

describe('avatarColor', () => {
  it('always returns a colour from the palette', () => {
    for (const id of ['UA', 'UZ', 'U9', 'X', '']) {
      expect(AVATAR_PALETTE).toContain(avatarColor(id));
    }
  });
  it('is deterministic for the same input', () => {
    expect(avatarColor('Uabc')).toBe(avatarColor('Uabc'));
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-06-29T12:00:00.000Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it('seconds bucket under a minute', () => {
    expect(formatRelativeTime(new Date(NOW - 10_000).toISOString())).toBe('trip.relativeTime.seconds');
  });
  it('minutes bucket under an hour', () => {
    expect(formatRelativeTime(new Date(NOW - 10 * 60_000).toISOString())).toBe('trip.relativeTime.minutes');
  });
  it('hours bucket beyond an hour', () => {
    expect(formatRelativeTime(new Date(NOW - 3 * 3_600_000).toISOString())).toBe('trip.relativeTime.hours');
  });
});

describe('memberStatusLabel', () => {
  const NOW = new Date('2026-06-29T12:00:00.000Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it('leader takes priority', () => {
    expect(memberStatusLabel(baseMember({ isLeader: true }))).toBe('trip.member.leader');
  });
  it('waiting when no location yet', () => {
    expect(memberStatusLabel(baseMember())).toBe('trip.member.waiting');
  });
  it('offline when last location is older than the threshold', () => {
    const stale = new Date(NOW - OFFLINE_THRESHOLD_MS - 1000).toISOString();
    const m = baseMember({ lastLocation: { lat: 0, lng: 0, distanceKm: null, accuracyM: null, distanceFromLeaderKm: 1, createdAt: stale } });
    expect(memberStatusLabel(m)).toBe('trip.member.offline');
  });
  it('distance-from-leader when location is fresh', () => {
    const fresh = new Date(NOW - 1000).toISOString();
    const m = baseMember({ lastLocation: { lat: 0, lng: 0, distanceKm: null, accuracyM: null, distanceFromLeaderKm: 2.4, createdAt: fresh } });
    expect(memberStatusLabel(m)).toBe('trip.member.distanceFromLeader');
  });
});

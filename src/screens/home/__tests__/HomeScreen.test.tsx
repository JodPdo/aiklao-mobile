// src/screens/home/__tests__/HomeScreen.test.tsx
//
// UI-1 regression guard: with 3+ active trips, "Start New Trip" and the background
// permission prompt used to render BELOW the trip cards inside a <Screen padded> that
// had no ScrollView anywhere — so on a real phone they sat under the fold with no way
// to scroll to them. Two things had to change (reorder + make it scroll), and this file
// pins both.
//
// Why these assertions are written the way they are: a presence-only check
// (`getByText('home.startNewTrip')` is truthy) passes just as happily against the OLD
// broken layout — the button was always rendered, it was just unreachable. So the order
// tests walk the rendered tree and compare actual render positions, and the scroll test
// asserts the cards are real descendants of a ScrollView rather than asserting a prop
// exists. Both would fail if this change were reverted; a presence check would not.
//
// i18n is mocked as `t: (k) => k` (same convention as TripActionBar.test.tsx /
// useSos.test.ts), so labels are matched by translation key, not fragile display copy.
// Trip *names* pass through as raw props, so they stay distinguishable from keyed text
// and are what the order assertions anchor the card positions on.

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';
import type { TripSummary } from '@/api/client';

jest.mock('@/i18n', () => ({ t: (k: string) => k }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // The real hook re-runs its effect on screen focus; under test, mounting IS the focus
  // event. Deps are fixed to [] to match HomeScreen's own useCallback(..., []).
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React_ = require('react');
    React_.useEffect(cb, []);
  },
}));

jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ user: { displayName: 'Jod' } }),
}));

const mockListTrips = jest.fn();
jest.mock('@/api/client', () => ({
  listTrips: (...args: unknown[]) => mockListTrips(...args),
}));

jest.mock('@/services/locationTask', () => ({
  stopBackgroundTracking: jest.fn().mockResolvedValue(undefined),
  getActiveTripId: jest.fn().mockResolvedValue(null),
}));

const mockGetForeground = jest.fn();
const mockGetBackground = jest.fn();
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: () => mockGetForeground(),
  getBackgroundPermissionsAsync: () => mockGetBackground(),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

function makeTrip(n: number): TripSummary {
  return {
    id: String(n),
    name: `Trip ${n}`,
    status: 'active',
    createdAt: '2026-07-20T00:00:00.000Z',
    memberCount: 2,
  };
}

/**
 * Collects every rendered string in depth-first render order. Index comparisons over
 * this array are what make the ordering assertions real — presence checks can't tell
 * "button above cards" from "button below cards".
 */
function textsInOrder(node: unknown, acc: string[] = []): string[] {
  if (node == null || node === false) return acc;
  if (typeof node === 'string') { acc.push(node); return acc; }
  if (typeof node === 'number') { acc.push(String(node)); return acc; }
  if (Array.isArray(node)) { node.forEach((n) => textsInOrder(n, acc)); return acc; }
  const children = (node as { children?: unknown[] }).children;
  if (children) children.forEach((c) => textsInOrder(c, acc));
  return acc;
}

/**
 * Finds the first node of a given host type in the rendered tree. RN's <ScrollView>
 * renders down to the host component 'RCTScrollView' (verified against this repo's
 * jest-expo preset). Searching the tree by host type keeps the containment assertion
 * independent of which RNTL query helpers a given version exposes.
 */
function findHostNode(node: unknown, hostType: string): any {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findHostNode(n, hostType);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as { type?: unknown; children?: unknown[] };
  if (el.type === hostType) return el;
  for (const child of el.children ?? []) {
    const hit = findHostNode(child, hostType);
    if (hit) return hit;
  }
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: permissions fully granted -> no background prompt, so the button/card
  // ordering tests aren't entangled with the prompt. The prompt gets its own test.
  mockGetForeground.mockResolvedValue({ status: 'granted' });
  mockGetBackground.mockResolvedValue({ status: 'granted' });
});

describe('HomeScreen — UI-1 layout', () => {
  it('renders Start New Trip BEFORE the first ActiveTripCard when trips exist', async () => {
    mockListTrips.mockResolvedValue([makeTrip(1), makeTrip(2), makeTrip(3)]);
    const { toJSON, getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText('Trip 1')).toBeTruthy());

    const texts = textsInOrder(toJSON());
    const buttonIdx = texts.indexOf('home.startNewTrip');
    const firstCardIdx = texts.indexOf('Trip 1');

    expect(buttonIdx).toBeGreaterThanOrEqual(0);
    expect(firstCardIdx).toBeGreaterThanOrEqual(0);
    expect(buttonIdx).toBeLessThan(firstCardIdx);
  });

  it('orders the background prompt between the button and the cards', async () => {
    // Jod's stated order: greeting -> Start New Trip -> prompt -> cards.
    mockListTrips.mockResolvedValue([makeTrip(1), makeTrip(2), makeTrip(3)]);
    mockGetBackground.mockResolvedValue({ status: 'undetermined' });
    const { toJSON, getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText('home.bgPrompt.title')).toBeTruthy());

    const texts = textsInOrder(toJSON());
    const buttonIdx = texts.indexOf('home.startNewTrip');
    const promptIdx = texts.indexOf('home.bgPrompt.title');
    const firstCardIdx = texts.indexOf('Trip 1');

    expect(buttonIdx).toBeLessThan(promptIdx);
    expect(promptIdx).toBeLessThan(firstCardIdx);
  });

  it('renders the unchanged empty state with 0 trips', async () => {
    mockListTrips.mockResolvedValue([]);
    const { getByText, queryByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText('home.noActiveTrip')).toBeTruthy());

    expect(getByText('home.noActiveTripBody')).toBeTruthy();
    expect(getByText('home.startNewTrip')).toBeTruthy();
    // No cards in this branch.
    expect(queryByText('home.activeTripCard.label')).toBeNull();
  });

  it('renders all cards inside a scrollable container with many trips', async () => {
    const trips = Array.from({ length: 8 }, (_, i) => makeTrip(i + 1));
    mockListTrips.mockResolvedValue(trips);
    const { toJSON, getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText('Trip 8')).toBeTruthy());

    // Descendant check, not a prop check: every card must live *inside* the ScrollView,
    // which is what actually makes the 8th one reachable on a phone. Asserting against
    // the ScrollView's own subtree (rather than the whole screen) is what makes this fail
    // if the ScrollView is ever removed or the cards are hoisted out of it.
    const scroll = findHostNode(toJSON(), 'RCTScrollView');
    expect(scroll).toBeTruthy();

    const inScroll = textsInOrder(scroll);
    trips.forEach((trip) => {
      expect(inScroll).toContain(trip.name);
    });
    // The primary action is inside the same scrollable region, not stranded outside it.
    expect(inScroll).toContain('home.startNewTrip');
  });
});

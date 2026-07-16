// src/screens/trip/components/__tests__/TripActionBar.test.tsx
//
// B2-6: the FIRST real screen/component-level test in this repo written with
// @testing-library/react-native's actual render()/fireEvent() API (not renderHook).
// The one hook-level test we already have (src/hooks/__tests__/useInviteDeepLink.test.tsx)
// proves the join→starts-tracking wiring inside a hook, but per CONTEXT.md Rule A this
// codebase has shipped "tests green" before with ZERO coverage of what a user actually
// sees/taps on screen (the B2-2→B2-5 batch: 82/82 green, no test touching the real
// join-starts-tracking bug). This file closes that specific gap for the B2-1 share-location
// toggle: does the rendered button actually reflect `isSharing`, and does tapping it
// actually invoke the wired handler — not "does the prop exist," which a render() call
// alone can't distinguish from a typo'd wire-up.
//
// Scope note (screen vs. component): TripDetailScreen.tsx was the ticket's suggested
// candidate, but rendering it directly requires mocking a much larger surface than this
// one toggle needs — react-navigation's useRoute/useNavigation, useSafeAreaInsets, the
// api client, expo-location's one-shot fix effect, two useFocusEffect blocks, the useSos
// controller (its own Alert-driven API calls), and — heaviest of all — TripMapView, which
// pulls in <LeafletMapView> which renders a real react-native-webview <WebView> with an
// embedded HTML string (src/components/LeafletMapView.tsx:7-8). None of that machinery
// touches the share toggle's own render/press contract. TripActionBar (its only consumer
// is TripDetailScreen.tsx:370-378, wiring isSharing/sharingLoading/onToggleSharing straight
// through with no extra logic) is the actual unit that owns "does the toggle look right and
// call the right thing" — testing it directly, for real, with real render()/fireEvent(),
// is a stronger regression guard than a screen test that mocks so much of itself it stops
// exercising real component behavior. TripActionBar needs no provider wrapping: useTheme()
// (src/theme/ThemeProvider.tsx:18-23) and Button's own useTheme() call both read from
// ThemeContext's default value when no <ThemeProvider> is mounted, so this stays a plain
// render() with no context setup — nothing here is faked to make the test pass.
//
// i18n mocked as `t: (k) => k` (same convention as useSos.test.ts / useInviteDeepLink.test.tsx)
// so button labels are asserted by their literal translation keys, not fragile English copy.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripActionBar } from '../TripActionBar';

jest.mock('@/i18n', () => ({ t: (k: string) => k }));

function makeProps(overrides: Partial<React.ComponentProps<typeof TripActionBar>> = {}) {
  return {
    memberCount: 3,
    isSharing: false,
    sharingLoading: false,
    onToggleSharing: jest.fn(),
    bottomInset: 16,
    onMembers: jest.fn(),
    ...overrides,
  };
}

describe('TripActionBar — B2-1 share-location toggle', () => {
  it('renders the OFF label when isSharing is false', async () => {
    const { getByText, queryByText } = await render(<TripActionBar {...makeProps({ isSharing: false })} />);

    expect(getByText('trip.sharing.off')).toBeTruthy();
    expect(queryByText('trip.sharing.on')).toBeNull();
  });

  it('renders the ON label when isSharing is true', async () => {
    const { getByText, queryByText } = await render(<TripActionBar {...makeProps({ isSharing: true })} />);

    expect(getByText('trip.sharing.on')).toBeTruthy();
    expect(queryByText('trip.sharing.off')).toBeNull();
  });

  it('reflects a change in isSharing across a re-render (not a static/first-render-only label)', async () => {
    const props = makeProps({ isSharing: false });
    const { getByText, queryByText, rerender } = await render(<TripActionBar {...props} />);
    expect(getByText('trip.sharing.off')).toBeTruthy();

    await rerender(<TripActionBar {...props} isSharing />);

    expect(getByText('trip.sharing.on')).toBeTruthy();
    expect(queryByText('trip.sharing.off')).toBeNull();
  });

  it('calls onToggleSharing when pressed while OFF (the "start sharing" tap)', async () => {
    const onToggleSharing = jest.fn();
    const { getByText } = await render(<TripActionBar {...makeProps({ isSharing: false, onToggleSharing })} />);

    fireEvent.press(getByText('trip.sharing.off'));

    expect(onToggleSharing).toHaveBeenCalledTimes(1);
  });

  it('calls the SAME onToggleSharing when pressed while ON (the "stop sharing" tap) — one handler, both directions', async () => {
    // Guards TripDetailScreen.tsx:219-221's documented contract: a single toggle handles
    // both start and stop, no separate stop button/handler exists.
    const onToggleSharing = jest.fn();
    const { getByText } = await render(<TripActionBar {...makeProps({ isSharing: true, onToggleSharing })} />);

    fireEvent.press(getByText('trip.sharing.on'));

    expect(onToggleSharing).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onToggleSharing when pressed while a toggle request is already in flight (sharingLoading)', async () => {
    // sharingLoading sets Button's isDisabled -> Pressable disabled={true} (Button.tsx:36,79),
    // and swaps the label for an ActivityIndicator (Button.tsx:85-86) — guards against a
    // double-tap firing two overlapping start/stop calls while the first is still pending.
    // The label text is gone while loading, so there's nothing to grab with getByText; the
    // spinner has no testID either (none was added — see file header), so the ActivityIndicator
    // host instance itself is used as the press anchor. fireEvent.press bubbles up from
    // wherever it's given to the nearest ancestor exposing onPress (same mechanism getByText
    // relies on above), so pressing "through" the spinner is equivalent to a user tapping
    // anywhere inside the button while it shows its loading state.
    const onToggleSharing = jest.fn();
    const { container, queryByText } = await render(
      <TripActionBar {...makeProps({ isSharing: false, sharingLoading: true, onToggleSharing })} />,
    );

    // Confirms the loading state actually rendered (sanity: no accidental leftover label).
    expect(queryByText('trip.sharing.off')).toBeNull();
    expect(queryByText('trip.sharing.on')).toBeNull();

    const [spinner] = container.queryAll((instance) => instance.type === 'ActivityIndicator');
    expect(spinner).toBeTruthy();
    fireEvent.press(spinner);

    expect(onToggleSharing).not.toHaveBeenCalled();
  });
});

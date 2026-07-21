// src/screens/trip/components/__tests__/TripMoreActionsSheet.test.tsx
//
// MB-5: TripMoreActionsSheet stopped being leader-only — each row (Invite / End
// trip / Leave trip) now renders solely based on whether its handler prop was
// supplied, and the screen decides which props to pass per the caller's role
// (leader gets Invite+End-trip, a member gets Leave-trip, per
// MB5_LEAVE_TRIP_DESIGN.md). This is a real-render test (same convention as
// TripActionBar.test.tsx) covering exactly that role-gating contract, since a
// regression here (e.g. a member seeing "End trip") would be a real bug, not
// just a cosmetic one.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripMoreActionsSheet } from '../TripMoreActionsSheet';

jest.mock('@/i18n', () => ({ t: (k: string) => k }));

describe('TripMoreActionsSheet — role-gated rows (MB-5)', () => {
  it('renders ONLY Leave trip for a member (onInvite/onEndTrip omitted)', async () => {
    const onLeaveTrip = jest.fn();
    const { getByText, queryByText } = await render(
      <TripMoreActionsSheet visible onLeaveTrip={onLeaveTrip} onClose={jest.fn()} />,
    );

    expect(getByText('trip.action.leave')).toBeTruthy();
    expect(queryByText('trip.invite')).toBeNull();
    expect(queryByText('trip.action.end')).toBeNull();
  });

  it('renders ONLY Invite + End trip for a leader (onLeaveTrip omitted)', async () => {
    const { getByText, queryByText } = await render(
      <TripMoreActionsSheet
        visible
        onInvite={jest.fn()}
        onEndTrip={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByText('trip.invite')).toBeTruthy();
    expect(getByText('trip.action.end')).toBeTruthy();
    expect(queryByText('trip.action.leave')).toBeNull();
  });

  it('calls onLeaveTrip when the Leave trip row is pressed', async () => {
    const onLeaveTrip = jest.fn();
    const { getByText } = await render(
      <TripMoreActionsSheet visible onLeaveTrip={onLeaveTrip} onClose={jest.fn()} />,
    );

    fireEvent.press(getByText('trip.action.leave'));

    expect(onLeaveTrip).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed, without firing any row handler', async () => {
    const onLeaveTrip = jest.fn();
    const onClose = jest.fn();
    const { getByText } = await render(
      <TripMoreActionsSheet visible onLeaveTrip={onLeaveTrip} onClose={onClose} />,
    );

    fireEvent.press(getByText('common.close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLeaveTrip).not.toHaveBeenCalled();
  });

  it('renders no action rows when no handler prop is supplied at all (defensive — should not occur in practice)', async () => {
    const { queryByText } = await render(
      <TripMoreActionsSheet visible onClose={jest.fn()} />,
    );

    expect(queryByText('trip.invite')).toBeNull();
    expect(queryByText('trip.action.end')).toBeNull();
    expect(queryByText('trip.action.leave')).toBeNull();
    // The close button is still there — the sheet is never a dead end.
    expect(queryByText('common.close')).toBeTruthy();
  });
});

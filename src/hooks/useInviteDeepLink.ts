// src/hooks/useInviteDeepLink.ts
// Drives the invite deep-link lifecycle. Mounted once (in RootNavigator).
//
// Cold start: Linking.getInitialURL() captures the launch URL.
// Hot start:  Linking.addEventListener('url') captures URLs while running.
// A captured token is queued (AsyncStorage) and redeemed once the user is
// authenticated AND the navigator is ready — so it survives the login flow
// (Feature 6) and never fires before navigation can handle it.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '@/auth/AuthContext';
import { acceptInvite } from '@/api/client';
import { navigationRef, navigateToTrip } from '@/navigation/navigationRef';
import { notify } from '@/services/notify';
import { t } from '@/i18n';
import {
  parseInviteToken,
  getPendingToken,
  setPendingToken,
  clearPendingToken,
} from '@/services/inviteDeepLink';

export function useInviteDeepLink() {
  const { status } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const processingRef = useRef(false);

  // Capture cold-start URL + any persisted pending token, and subscribe to
  // hot-start URLs. Runs once.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const persisted = await getPendingToken();
      if (mounted && persisted) setPending(persisted);

      const initialUrl = await Linking.getInitialURL();
      const token = parseInviteToken(initialUrl);
      if (token) {
        await setPendingToken(token);
        if (mounted) setPending(token);
      }
    })();

    const sub = Linking.addEventListener('url', async ({ url }) => {
      const token = parseInviteToken(url);
      if (token) {
        await setPendingToken(token);
        setPending(token);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Attempt redemption when we have a token, the user is authenticated, and
  // the navigator is mounted. Idempotent via processingRef. Safe to call from
  // both the effect below and NavigationContainer's onReady.
  const processPendingInvite = useCallback(async () => {
    if (processingRef.current) return;
    if (!pending) return;
    if (status !== 'authenticated') return;     // Feature 6 — wait for login
    if (!navigationRef.isReady()) return;        // wait for navigation

    processingRef.current = true;
    try {
      const result = await acceptInvite(pending);
      switch (result.kind) {
        case 'joined':
          await clearPendingToken();
          setPending(null);
          notify(t('invite.joined', { name: result.tripName }));
          navigateToTrip(result.tripId);
          break;
        case 'already':
          await clearPendingToken();
          setPending(null);
          notify(t('invite.welcomeBack'));
          navigateToTrip(result.tripId);
          break;
        case 'expired':
          await clearPendingToken();
          setPending(null);
          notify(t('invite.expired'));
          break;
        case 'notfound':
          await clearPendingToken();
          setPending(null);
          notify(t('invite.invalid'));
          break;
        case 'error':
        default:
          // Keep the token queued; a transient error retries on next trigger
          // (new url, status change, or onReady).
          notify(t('invite.connectFailed'));
          break;
      }
    } finally {
      processingRef.current = false;
    }
  }, [pending, status]);

  useEffect(() => {
    processPendingInvite();
  }, [processPendingInvite]);

  // RootNavigator passes this to <NavigationContainer onReady>.
  return { onNavigationReady: processPendingInvite };
}

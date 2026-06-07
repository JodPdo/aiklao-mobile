// src/services/notify.ts
// Lightweight cross-platform toast. The app has no toast library; Android has
// ToastAndroid, iOS falls back to Alert (matches the app's Alert-based feedback).

import { Alert, Platform, ToastAndroid } from 'react-native';

export function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
}

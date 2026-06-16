# AiKlao Mobile

**Real-time group trip-tracking app — React Native (Expo) + TypeScript.**

AiKlao lets a group of friends share their live location during a trip: see who's where on a map, distance and ETA to the destination, break status, and an emergency **SOS** alert. This repository is the **mobile app**; it talks to a separate Node.js / Express + PostgreSQL backend.

**Version:** 0.4.9 · **Language:** TypeScript · **Platform:** Android (Expo / EAS) — iOS runnable via Expo

➡️ **Try it now (Android APK):** https://github.com/JodPdo/aiklao-mobile/releases/latest

---

## Features (v0.4.9)

- **LINE Login** — OAuth 2.0 + PKCE via `expo-auth-session` + `expo-crypto`; backend issues a JWT, stored with `expo-secure-store`, attached to every API call by an axios interceptor.
- **Background GPS tracking** — `expo-location` + `expo-task-manager` running as an Android **foreground service**. The app is the single writer of location data ("Pattern A").
- **Adaptive updates & battery saving** — adaptive 10s / 30s update intervals, with automatic power-save below 20% battery (`expo-battery`).
- **Live map** — interactive map rendered with Leaflet inside a `react-native-webview`, with live "pulse" markers for each member.
- **Trips & members** — create / join a trip, view members, and an active-trip card with live status.
- **Invites** — share a trip via deep links (`expo-linking`) and clipboard, with in-app invite handling.
- **Emergency SOS** — one-tap SOS button that raises an alert to the group.
- **Notifications** — trip / alert notifications (`POST_NOTIFICATIONS`).
- **Internationalization** — Thai / English, following the device locale (`i18n-js` + `expo-localization`).
- **Dark mode** — theme switching that respects the system appearance.
- **Permission flows** — guided foreground and background location permission gates.

---

## Tech stack

| Area | Tools |
|---|---|
| Core | React Native, Expo, TypeScript |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Auth | `expo-auth-session`, `expo-crypto` (OAuth 2.0 + PKCE), `expo-secure-store` |
| Networking | `axios` (with a JWT request interceptor) |
| Location | `expo-location`, `expo-task-manager`, `expo-battery` |
| Map | `react-native-webview` + Leaflet, `react-native-maps` |
| i18n | `i18n-js`, `expo-localization` |
| Build / release | EAS Build → GitHub Releases (APK) |

---

## Architecture — "Pattern A" (single writer)

The mobile app is the **single writer** of location data. A background task captures GPS and `POST`s it to the backend REST API; all clients (this app and the LIFF web view) **read** derived state — distance, ETA, break status, SOS — that the backend computes. Authentication is a backend-issued JWT (after LINE Login), attached to requests by an axios interceptor.

```
        LINE Login (OAuth 2.0 + PKCE)
                  │  id_token → exchange
                  ▼
   ┌─────────────────────────────┐        POST location (background task)
   │   AiKlao Mobile (Expo/RN)    │ ───────────────────────────────────────┐
   │   • JWT in SecureStore       │                                         ▼
   │   • foreground-service GPS   │        GET trip state (ETA / SOS / break)
   │   • Leaflet map (WebView)    │ ◀───────────────────────────────────────┐
   └─────────────────────────────┘                                         │
                  ▲                                                         │
                  │                              ┌──────────────────────────┴───┐
                  └──────────────────────────────│  Backend: Node/Express + PG  │
                                                 │  (separate service)          │
                                                 └──────────────────────────────┘
```

> The backend (REST API, SOS de-duplication, ETA, scheduler) lives in a separate repository and is not included here.

---

## Project structure

```
aiklao-mobile/
├── App.tsx                      # Entry point
├── app.json                     # Expo config (extra: apiBaseUrl, lineChannelId, eas)
├── eas.json                     # EAS Build profiles
├── src/
│   ├── api/
│   │   └── client.ts            # axios instance + JWT interceptor
│   ├── auth/
│   │   ├── AuthContext.tsx      # auth state (React Context)
│   │   ├── lineLogin.ts         # LINE OAuth 2.0 + PKCE flow
│   │   └── tokenStorage.ts      # SecureStore wrapper
│   ├── components/
│   │   ├── ActiveTripCard.tsx
│   │   ├── InviteMembersModal.tsx
│   │   ├── LeafletMapView.tsx   # Leaflet map in a WebView
│   │   ├── LivePulseDot.tsx
│   │   ├── SosButton.tsx
│   │   └── …
│   ├── hooks/                   # useDarkMode, useInviteDeepLink, usePowerSaveMode
│   ├── i18n/                    # en.ts, th.ts, index.ts
│   ├── navigation/              # Root / Auth / App navigators (auth gate + tabs)
│   ├── permissions/             # foreground + background location gates
│   ├── screens/                 # auth, home, map, trip, trips, settings
│   ├── services/                # locationTask.ts, inviteDeepLink.ts, notify.ts
│   └── theme/                   # ThemeProvider, colors, spacing, typography
└── …
```

---

## Getting started

### Prerequisites
- Node.js + npm
- Expo tooling (`npx expo`)
- A running AiKlao backend (for auth + trip data)
- A **LINE Login** channel (OpenID Connect enabled)

### Run locally
```bash
npm install
npm start          # then press 'a' (Android) / 'i' (iOS), or scan the QR with Expo Go / a dev client
```

### Configuration (`app.json` → `expo.extra`)
| Key | Description |
|---|---|
| `apiBaseUrl` | Base URL of the AiKlao backend |
| `lineChannelId` | LINE Login channel ID |
| `eas.projectId` | EAS project ID (for builds) |

Android permissions requested: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

---

## Scripts

```bash
npm start        # Expo dev server
npm run android  # open on Android
npm run ios      # open on iOS
npm run typecheck# tsc --noEmit
npm run lint     # eslint
```

---

## Build & release

Built with **EAS Build** and published to **GitHub Releases** as a downloadable APK.

```bash
npx eas-cli build --profile preview --platform android     # internal testing
npx eas-cli build --profile production --platform android   # release build
```

Latest release: https://github.com/JodPdo/aiklao-mobile/releases/latest

---

## Status

In real-world testing with an early group of users on real trips. Actively developed.

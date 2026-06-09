// src/i18n/en.ts
// English translations — the FALLBACK locale and the source-of-truth shape.
// `th.ts` is typed against `Resources`, so adding a key here forces a Thai value.
// Interpolation uses i18n-js syntax: %{name}. Count strings use plural({...})
// (English picks one/other; Thai only needs `other` — see the th pluralizer in
// index.ts).

/** i18n-js plural form. `other` is required (CLDR); the rest are optional. */
type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
const plural = (forms: Plural): Plural => forms;

export const en = {
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    ok: 'OK',
    retry: 'Try again',
  },
  nav: {
    home: 'Home',
    trips: 'Trips',
    settings: 'Settings',
  },
  permission: {
    requiredTitle: 'Location Required',
    requiredBody: 'AiKlao uses your location to track trips in real time while the app is open.',
    allow: 'Allow Location',
    deniedTitle: 'Location Permission Denied',
    deniedBody: 'Please enable location access in Settings to use AiKlao trip tracking.',
    openSettings: 'Open Settings',
  },
  invite: {
    title: 'Invite friends to the trip',
    loadFailed: 'Could not load the link',
    codeCopied: 'Code copied',
    linkCopied: 'Link copied',
    orUseCode: 'or use code: %{code}',
    codeLabel: 'Invite code',
    linkLabel: 'Invite link',
    copy: 'Copy',
    expires: 'Link expires: %{date}',
    share: 'Share',
    joined: 'Joined %{name}',
    welcomeBack: 'Welcome back',
    expired: 'Link expired',
    invalid: 'Invalid link',
    connectFailed: 'Could not connect. Try again.',
  },
  login: {
    subtitle: 'Track your trip in real time',
    signInWithLine: 'Sign in with LINE',
    note: 'Use the same LINE account you use in LIFF — your trips sync automatically.',
    errorTitle: 'Error',
    signInFailed: 'Sign-in failed',
  },
  home: {
    greeting: 'Hello, %{name}',
    subtitle: 'Ready for a trip today?',
    startNewTrip: 'Start New Trip',
    noActiveTrip: 'No active trip',
    noActiveTripBody: 'Tap "Start New Trip" to begin tracking your location.',
    activeTripCard: {
      label: 'Active trip',
      members: plural({ one: '%{count} member', other: '%{count} members' }),
      open: 'Open trip →',
      a11yOpen: 'Open active trip: %{name}',
    },
    bgPrompt: {
      title: 'Background tracking off',
      body: 'Locations pause when the app is in the background.',
      enable: 'Enable',
      settings: 'Settings',
    },
  },
  trips: {
    title: 'My Trips',
    status: {
      active: 'Active',
      archived: 'Archived',
    },
    members: plural({ one: '%{count} member', other: '%{count} members' }),
    leader: 'Leader',
    loadError: 'Could not load trips. Check your connection.',
    empty: {
      title: 'No trips yet',
      body: 'Your trips will appear here once you start tracking.',
    },
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your preferences',
    guest: 'Guest',
    statusReady: 'Ready for trips',
    section: {
      account: 'Account',
      preferences: 'Preferences',
      help: 'Help',
    },
    profile: 'Profile',
    connectedDevices: 'Connected devices',
    deviceCount: plural({ one: '%{count} device', other: '%{count} devices' }),
    notifications: 'Notifications',
    on: 'On',
    manage: 'Manage',
    privacy: 'Privacy',
    helpFaq: 'Help & FAQ',
    signOut: 'Sign out',
    powerSave: {
      label: 'Power-saving mode',
      sub: 'Saves battery on long trips · POST every 30s',
    },
    darkMode: {
      label: 'Dark mode',
      sub: 'Dark theme · saves OLED battery',
    },
  },
  createTrip: {
    title: 'Create a new trip',
    subtitle: 'Fill in the details so your group can see where you are headed.',
    nameLabel: 'Trip name',
    namePlaceholder: 'e.g. Chiang Mai New Year trip',
    nameRequired: 'Please enter a trip name',
    destinationLabel: 'Destination',
    optional: '(optional)',
    changeDestination: 'Change destination',
    pickOnMap: 'Choose destination on map',
    submit: 'Create trip & start',
    submitting: 'Creating...',
    createFailed: 'Could not create trip',
  },
  destinationPicker: {
    headerTitle: 'Choose destination',
    defaultName: 'Destination',
    loadingMap: 'Loading map...',
    instruction: 'Tap the map to choose a destination',
    selectedLocation: 'Selected location',
    nameLabel: 'Destination name',
    noSelectionTitle: 'Choose a destination first',
    noSelectionBody: 'Tap the map to pick your destination.',
  },
  map: {
    tripLabel: 'Trip #%{id}',
    selfMarker: 'You',
    tracking: {
      background: 'Background tracking active',
      foreground: 'Foreground tracking only',
    },
  },
  // Shared SOS strings — used by MapScreen + TripDetail banners, the useSos hook
  // (confirm/cancel/error alerts), and SosButton.
  sos: {
    bannerActive: '🚨 SOS ACTIVE · %{time}',
    confirmTitle: '🚨 Confirm sending SOS?',
    confirmMessage: 'Everyone in the trip will be alerted immediately, with your current location.',
    confirmSend: 'Send SOS',
    noCoordsTitle: 'Cannot send SOS',
    noCoordsMessage: 'Your location is not available yet.',
    existsTitle: 'SOS already sent',
    existsMessage: 'You have an active SOS that has not been cancelled.',
    sendFailed: 'Could not send SOS',
    cancelTitle: 'Cancel SOS?',
    cancelMessage: 'Everyone will see that your SOS was cancelled.',
    cancelConfirm: 'Cancel SOS',
    cancelNo: 'No',
    cancelFailed: 'Could not cancel',
    buttonCancel: '❌ Cancel SOS',
    a11ySend: 'Send SOS signal',
    a11yCancel: 'Cancel SOS',
  },
  trip: {
    title: 'Trip details',
    loading: 'Loading...',
    started: 'Started',
    status: {
      active: 'On the way',
      waiting: 'Waiting for data',
      archived: 'Ended',
    },
    relativeTime: {
      seconds: '%{count} sec ago',
      minutes: '%{count} min ago',
      hours: '%{count} hr ago',
    },
    member: {
      leader: 'Leader',
      waiting: 'Waiting',
      offline: 'Offline',
      distanceFromLeader: '%{km} km',
      you: '(you)',
      arrivedAt: '✅ Arrived at %{time}',
      updatedAt: 'Updated %{time}',
      noLocation: 'Has not shared location yet',
    },
    members: {
      count: plural({ one: '%{count} member', other: '%{count} members' }),
    },
    invite: 'Invite',
    stats: {
      destination: 'Destination',
      noDestination: 'No destination set',
      distance: 'Distance',
      km: 'km',
      eta: 'ETA',
    },
    action: {
      end: 'End',
    },
    caption: {
      autoRefresh: 'Location updates automatically every 60 seconds',
      powerSave: 'Battery saver%{battery} · pull to refresh only',
    },
    emptyCta: 'No one is sharing location yet — tap "Share location" below to start.',
    a11y: {
      back: 'Go back',
    },
    map: {
      navFailed: 'Could not open navigation',
      placeholderPowerSave: 'Map is off in battery-saver mode',
      a11yNavigate: 'Navigate to destination',
      a11yRecenter: 'Back to my location',
    },
    share: {
      notLeaderMessage: 'Only the trip leader can invite friends.',
      inviteHeader: 'Join our trip',
      inviteHeaderNamed: 'Join our trip: %{name}',
    },
    endTrip: {
      title: 'End this trip?',
      message: 'This action cannot be undone.',
      confirm: 'End trip',
      failed: 'Could not end the trip',
    },
    error: {
      notMember: 'You are not a member of this trip',
      notFound: 'Trip not found',
      loadFailed: 'Could not load data',
    },
  },
};

export type Resources = typeof en;

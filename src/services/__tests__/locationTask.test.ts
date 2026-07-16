// src/services/__tests__/locationTask.test.ts
// Covers the HTTP 429 (rate-limited) backoff in the background location task: after a 429
// the task should skip posting for the next few ticks instead of hammering the server again
// at the same cadence. expo-task-manager/expo-location are mocked because this test invokes
// the registered task callback directly, outside any real background-task runtime.
// AsyncStorage uses the global in-memory mock wired up in jest.setup.js.

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 2, High: 4 },
  LocationActivityType: { AutomotiveNavigation: 2 },
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  api: { post: jest.fn() },
}));

import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import { ACTIVE_TRIP_KEY, BG_LOCATION_TASK, __resetRateLimitBackoffForTests } from '../locationTask';

// The module registers its handler via TaskManager.defineTask(name, handler) as a side
// effect of the import above. Grab that handler so it can be invoked directly.
const defineTaskMock = TaskManager.defineTask as jest.Mock;
const taskHandler = defineTaskMock.mock.calls.find(([name]) => name === BG_LOCATION_TASK)?.[1] as
  | ((event: { data: { locations: any[] }; error: { message: string } | null }) => Promise<void>)
  | undefined;

function makeLocation(lat = 1, lng = 2) {
  return {
    coords: { latitude: lat, longitude: lng, accuracy: 5 },
    timestamp: Date.now(),
  };
}

describe('bg-location task — 429 backoff', () => {
  beforeEach(async () => {
    __resetRateLimitBackoffForTests();
    (api.post as jest.Mock).mockReset();
    await AsyncStorage.setItem(ACTIVE_TRIP_KEY, 'trip-1');
  });

  afterEach(async () => {
    await AsyncStorage.removeItem(ACTIVE_TRIP_KEY);
  });

  it('registers the handler under BG_LOCATION_TASK', () => {
    expect(taskHandler).toBeInstanceOf(Function);
  });

  it('posts normally when there is no active backoff', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('enters backoff after a 429 and skips the next ticks without posting, then resumes', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 429 } });
    await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    expect(api.post).toHaveBeenCalledTimes(1); // the 429 attempt itself

    // The next RATE_LIMIT_BACKOFF_TICKS (4) ticks should be skipped entirely — no POST.
    for (let i = 0; i < 4; i++) {
      await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    }
    expect(api.post).toHaveBeenCalledTimes(1);

    // Backoff has worn off — posting resumes on the next tick.
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('does not arm backoff on a non-429 failure', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 500 } });
    await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    expect(api.post).toHaveBeenCalledTimes(1);

    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await taskHandler!({ data: { locations: [makeLocation()] }, error: null });
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});

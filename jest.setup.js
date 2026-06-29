// jest.setup.js — global test setup for the Expo/React Native app.
// Mocks the AsyncStorage native module (null under Jest) with the package's
// official in-memory mock so storage-backed modules can be unit-tested.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

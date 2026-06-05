// src/navigation/types.ts
// Central navigation param-list types. Imported by navigators and screens.
// Keeps imports one-directional (screen -> types only) to avoid circular deps.

export type AuthStackParamList = {
  Login: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  CreateTrip: { selectedDestination?: { name: string; lat: number; lng: number } } | undefined;
  DestinationPicker: undefined;
  MapScreen: { tripId: string };
  TripDetail: { tripId: string };
};

export type AppTabParamList = {
  Home: undefined;
  Trips: undefined;
  Settings: undefined;
};

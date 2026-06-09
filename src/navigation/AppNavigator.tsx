// src/navigation/AppNavigator.tsx
// Bottom tab navigator. Home tab is wrapped in a NativeStack so MapScreen
// can be pushed full-screen without affecting the Trips or Settings tabs.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { CreateTripScreen } from '@/screens/trip/CreateTripScreen';
import { DestinationPickerScreen } from '@/screens/trip/DestinationPickerScreen';
import { MapScreen } from '@/screens/map/MapScreen';
import { TripDetailScreen } from '@/screens/trip/TripDetailScreen';
import { TripsScreen } from '@/screens/trips/TripsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import type { AppTabParamList, HomeStackParamList } from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="CreateTrip"
        component={CreateTripScreen}
        options={{
          headerShown: true,
          title: t('createTrip.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <HomeStack.Screen
        name="DestinationPicker"
        component={DestinationPickerScreen}
        options={{
          headerShown: true,
          title: t('destinationPicker.headerTitle'),
          headerBackTitle: t('common.back'),
        }}
      />
      <HomeStack.Screen
        name="MapScreen"
        component={MapScreen}
        options={{ gestureEnabled: false }}
      />
      <HomeStack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  const { colors } = useTheme();

  return (
    // initialRouteName keeps Home the STARTUP tab even though it's the middle one
    // in the visual order (Trips · Home · Settings).
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{
          tabBarLabel: t('nav.trips'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('nav.settings'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, View } from 'react-native';
import { loadSettings } from '../utils/settingsManager';

export default function RootLayout() {
  useEffect(() => {
    // Lock orientation to landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    
    // Load saved settings
    loadSettings();
    
    // Hide Android Navigation Bar (Bottom buttons)
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a0a2e' }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar hidden />
    </View>
  );
}

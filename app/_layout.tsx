import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, View } from 'react-native';
import { loadSettings } from '../utils/settingsManager';
import { preloadSounds } from '../utils/soundProvider';
import ErrorBoundary from '../components/ErrorBoundary';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      await loadSettings();
      preloadSounds();
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden');
      }
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#1a0a2e' }} />;
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#1a0a2e' }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <StatusBar hidden />
      </View>
    </ErrorBoundary>
  );
}

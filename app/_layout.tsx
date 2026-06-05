import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, View } from 'react-native';
import { loadSettings } from '../utils/settingsManager';
import ErrorBoundary from '../components/ErrorBoundary';
import { checkServerStatus } from '../utils/serverStatus';
import AppDisabled from '../components/AppDisabled';

// Native splashni qo'lda yashirishimiz uchun avtomatik yashirishni o'chirib
// qo'yamiz — shunda init paytida qora ekran o'rniga native splash ko'rinadi.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* preventAutoHide xatolari katastrofik emas */
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [appEnabled, setAppEnabled] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Web brauzerlar landscape lock'ni qo'llab-quvvatlamaydi —
      // rejection'ni yutib yuboramiz, Android'da to'liq ishlaydi.
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
        () => {},
      );
      // settingsManager ni oldindan yuklab qo'yamiz — splash ham, AppDisabled
      // ham unga tayanadi, lekin bu juda tez (AsyncStorage o'qishi).
      await loadSettings();
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }

      // Server statusini tekshirish — agar tarmoq sekin bo'lsa, native splash
      // shu vaqt davomida ko'rinib turadi (qora ekran emas).
      try {
        const result = await checkServerStatus();
        setAppEnabled(result.status);
      } catch (e) {
        console.warn('[Layout] Server status tekshirishda xatolik:', e);
        // Xatolik bo'lsa — ilova ishlashda davom etadi (default: true)
      }

      setReady(true);
      // Native splashni shu yerda yashirish kerak — UI tayyor.
      // index.tsx (poyezdli splash) endi to'liq ishga tushadi.
      SplashScreen.hideAsync().catch(() => {});
    };
    init();
  }, []);

  if (!ready) {
    // Native expo splash ekranda turibdi (preventAutoHide tufayli). Bu yerda
    // qaytariladigan View shunchaki fon — foydalanuvchi uni ko'rmaydi.
    return <View style={{ flex: 1, backgroundColor: '#1a0a2e' }} />;
  }

  // Agar server status false bo'lsa — ilova o'chirilgan ekranni ko'rsatamiz
  if (!appEnabled) {
    return (
      <ErrorBoundary>
        <AppDisabled />
        <StatusBar hidden />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#1a0a2e' }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="soundtracks" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="player" options={{ animation: 'fade' }} />
        </Stack>
        <StatusBar hidden />
      </View>
    </ErrorBoundary>
  );
}

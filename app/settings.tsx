import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AppSettings, getSettings, loadSettings, saveSettings } from '../utils/settingsManager';
import { playSound } from '../utils/soundProvider';
import { palette } from '../utils/theme';
import { t } from '../utils/translations';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type LanguageOption = { id: 'uz' | 'en' | 'ru'; name: string; flag: string; nativeName: string };

const LANGUAGES: LanguageOption[] = [
  { id: 'uz', name: "O'zbek", flag: '🇺🇿', nativeName: "O'zbekcha" },
  { id: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { id: 'ru', name: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
];

// ═══════════════════════════════════════════════
// TOGGLE ROW COMPONENT
// ═══════════════════════════════════════════════
function SettingsToggle({ icon, title, subtitle, value, onToggle }: {
  icon: string; title: string; subtitle: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleToggle = (newVal: boolean) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    playSound('pop');
    onToggle(newVal);
  };

  return (
    <Animated.View style={[toggleStyles.container, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
      />
      <View style={toggleStyles.iconContainer}>
        <Text style={toggleStyles.icon}>{icon}</Text>
      </View>
      <View style={toggleStyles.textArea}>
        <Text style={toggleStyles.title}>{title}</Text>
        <Text style={toggleStyles.subtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={handleToggle}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4ECDC4' }}
        thumbColor={value ? '#FFF' : '#888'}
        ios_backgroundColor="rgba(255,255,255,0.15)"
        style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
      />
    </Animated.View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 22 },
  textArea: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});

// ═══════════════════════════════════════════════
// LANGUAGE SELECTOR
// ═══════════════════════════════════════════════
function LanguageSelector({ selected, onSelect }: { selected: string; onSelect: (lang: 'uz' | 'en' | 'ru') => void }) {
  return (
    <View style={langStyles.container}>
      <View style={langStyles.header}>
        <View style={langStyles.iconBox}>
          <Text style={{ fontSize: 22 }}>🌐</Text>
        </View>
        <View>
          <Text style={langStyles.title}>Til / Language</Text>
          <Text style={langStyles.subtitle}>{t('languageSubtitle')}</Text>
        </View>
      </View>
      <View style={langStyles.options}>
        {LANGUAGES.map((lang) => {
          const isActive = lang.id === selected;
          return (
            <TouchableOpacity
              key={lang.id}
              activeOpacity={0.7}
              onPress={() => {
                playSound('click');
                onSelect(lang.id);
              }}
            >
              <View style={[langStyles.option, isActive && langStyles.optionActive]}>
                {isActive && (
                  <LinearGradient
                    colors={['rgba(78,205,196,0.3)', 'rgba(78,205,196,0.1)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                )}
                <Text style={langStyles.flag}>{lang.flag}</Text>
                <Text style={[langStyles.langName, isActive && langStyles.langNameActive]}>
                  {lang.nativeName}
                </Text>
                {isActive && <Text style={langStyles.check}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const langStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  options: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 10,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
    minWidth: 110,
  },
  optionActive: {
    borderColor: '#4ECDC4',
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  flag: { fontSize: 22 },
  langName: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  langNameActive: { color: '#FFF' },
  check: { fontSize: 16, color: '#4ECDC4', fontWeight: '900' },
});

// ═══════════════════════════════════════════════
// MAIN SETTINGS SCREEN
// ═══════════════════════════════════════════════
export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    loadSettings().then((s) => setSettings(s));

    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    const updated = await saveSettings({ [key]: value });
    setSettings({ ...updated });
    
    // Vibrate on toggle if vibration is enabled
    if (key !== 'vibrationEnabled' && updated.vibrationEnabled) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  };

  const handleBack = () => {
    playSound('click');
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B3A7A', '#2E67B8', '#5DADE2']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative glowing orbs */}
      <View style={[styles.orb, { top: -40, right: -60, backgroundColor: palette.gold }]} />
      <View style={[styles.orb, { bottom: -50, left: -40, backgroundColor: palette.mint }]} />
      <View style={[styles.orb, { top: '40%', right: -80, backgroundColor: palette.rose, opacity: 0.08 }]} />

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
            />
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
            <Text style={styles.headerSub}>{t('settingsSubtitle')}</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        {/* Settings list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Audio & Haptics */}
          <Text style={styles.sectionTitle}>{t('soundSection')}</Text>

          <SettingsToggle
            icon="🔊"
            title={t('soundTitle')}
            subtitle={t('soundSubtitle')}
            value={settings.soundEnabled}
            onToggle={(v) => updateSetting('soundEnabled', v)}
          />

          <SettingsToggle
            icon="📳"
            title={t('vibrationTitle')}
            subtitle={t('vibrationSubtitle')}
            value={settings.vibrationEnabled}
            onToggle={(v) => updateSetting('vibrationEnabled', v)}
          />

          {/* Section: Language */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('languageSection')}</Text>

          <LanguageSelector
            selected={settings.language}
            onSelect={(lang) => updateSetting('language', lang)}
          />

          {/* App info */}
          <View style={styles.appInfo}>
            <Text style={styles.appName}>SmartSpeech 🦉</Text>
            <Text style={styles.appVersion}>v2.0.0 • Made with DarkLogicAX and ZULFIZAR UMAROVA</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  backIcon: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(78,205,196,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
  },
  appVersion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
});

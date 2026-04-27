import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { getSettings } from '../../utils/settingsManager';
import { getLocalVideoUri } from '../../utils/videoDownloader';

import BrandingIntro from '../../components/BrandingIntro';
import SmartSpeechWatermark from '../../components/SmartSpeechWatermark';
import StickerBurst from '../../components/StickerBurst';
import VictoryOverlay from '../../components/VictoryOverlay';
import { getLessonMeta } from '../../utils/alphabetData';
import { API } from '../../utils/api';
import { BeginnerWord, getWordForLetter } from '../../utils/beginnerWords';
import {
    LETTER_PHONETICS,
    matchesLetter,
    pickBestMatch,
} from '../../utils/letterPhonetics';
import { playSound } from '../../utils/soundProvider';
import { cleanTranscript, normalize, similarity } from '../../utils/textUtils';
import { palette, radius, shadowFx, spacing } from '../../utils/theme';
import { t } from '../../utils/translations';

// ─── Word emoji mapping ──────────────────────────────────────────
const WORD_EMOJIS: Record<string, string> = {
  apple: '🍎', ball: '⚽', cat: '🐱', dog: '🐶', egg: '🥚',
  fish: '🐟', girl: '👧', hat: '🎩', ice: '🧊', jam: '🍯',
  key: '🔑', lion: '🦁', moon: '🌙', nose: '👃', orange: '🍊',
  pen: '🖊️', queen: '👸', rain: '🌧️', sun: '☀️', tree: '🌳',
  umbrella: '☂️', van: '🚐', water: '💧', box: '📦', yellow: '🟡', zoo: '🦓',
};

// ─── Types ──────────────────────────────────────────────────────────
type Phase = 'video' | 'pronounce' | 'word' | 'letterDone' | 'victory';

interface LetterStep {
  letter: string;
  word: BeginnerWord;
}

// ─── Component ──────────────────────────────────────────────────────
export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const lessonId = parseInt(id as string, 10);
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const meta = getLessonMeta(lessonId);

  // ── Intro-video lesson (lesson 1) ──────────────────────────────
  if (meta?.type === 'intro') return <IntroLesson lessonId={lessonId} />;

  // ── Letter lesson ─────────────────────────────────────────────
  if (!meta || meta.letters.length === 0) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.loadTxt}>{t('lessonNotFound')}</Text>
      </View>
    );
  }

  return <LetterLesson lessonId={lessonId} letters={meta.letters} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INTRO LESSON — just a video, watching = mission complete
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IntroLesson({ lessonId }: { lessonId: number }) {
  const [errored, setErrored] = useState(false);
  const [showBranding, setShowBranding] = useState(true);
  const playerReadyRef = useRef(false);

  let videoSource: number | null = null;
  try {
    videoSource = require('../../assets/videos/harflar.mp4');
  } catch {
    videoSource = null;
  }

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = false;
    // Don't auto-play — wait for branding to finish
    playerReadyRef.current = true;
  });

  const handleBrandingDone = () => {
    setShowBranding(false);
    if (playerReadyRef.current) {
      try { player.play(); } catch {}
    }
  };

  const finish = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (raw) {
        const u = JSON.parse(raw);
        u.progress = Math.max(u.progress || 1, lessonId + 1);
        await AsyncStorage.setItem('user_data', JSON.stringify(u));
        await API.updateProgress(u.progress);
      }
    } catch {}
    playSound('victory');
    router.replace({
      pathname: '/dashboard',
      params: { unlockedLesson: String(lessonId + 1) },
    });
  }, [lessonId]);

  useEffect(() => {
    const endSub = player.addListener('playToEnd', finish);
    const statusSub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'error') setErrored(true);
    });
    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [player, finish]);

  if (errored || !videoSource) {
    return (
      <View style={[s.container, s.center, { backgroundColor: '#0A0A2E' }]}>
        {showBranding && <BrandingIntro onFinish={() => setShowBranding(false)} />}
        <Text style={{ fontSize: 80 }}>🎬</Text>
        <Text style={s.loadTxt}>{t('videoNotFound')}</Text>
        <TouchableOpacity style={s.skipBtn} onPress={finish}>
          <LinearGradient colors={[palette.gold, palette.sunDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
          <Text style={s.skipTxt}>{t('continueBtn')} ▶</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: '#000' }]}>
      <VideoView
        style={{ flex: 1, width: '100%', height: '100%' }}
        player={player}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />
      <SmartSpeechWatermark />
      <TouchableOpacity
        style={[s.skipBtn, { position: 'absolute', top: 30, right: 30 }]}
        onPress={() => {
          try { player.pause(); } catch {}
          finish();
        }}
      >
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
        <Text style={s.skipTxt}>{t('skipBtn')} ⏭</Text>
      </TouchableOpacity>
      {showBranding && <BrandingIntro onFinish={handleBrandingDone} />}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LETTER LESSON — per-letter: video → pronounce → word → congrats
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LetterLesson({
  lessonId,
  letters,
}: {
  lessonId: number;
  letters: string[];
}) {
  const { width: SCREEN_W } = useWindowDimensions();

  // Build the step list: one LetterStep per letter
  const steps: LetterStep[] = letters.map((l) => ({
    letter: l,
    word: getWordForLetter(l) || { en: l.toLowerCase(), uz: l },
  }));

  const [letterIdx, setLetterIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('video');
  const [showBranding, setShowBranding] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail'>('none');
  const [isVictory, setIsVictory] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const [stickerBurst, setStickerBurst] = useState<{ visible: boolean; type: 'success' | 'fail' }>({ visible: false, type: 'success' });
  const stickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Haptic feedback helper ──────────────────────────────────
  const triggerHaptic = (type: 'success' | 'fail') => {
    if (Platform.OS === 'web') return;
    try {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Extra vibration pattern for errors
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      }
    } catch {}
  };

  // Refs for event-callback access
  const letterIdxRef = useRef(0);
  const phaseRef = useRef<Phase>('video');
  const isCheckingRef = useRef(false);
  const lastInterimRef = useRef('');
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  // Animations
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const feedbackOp = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;

  // ── Video source for current letter ────────────────────────
  const currentLetter = steps[letterIdx]?.letter?.toLowerCase() ?? '';
  const [videoSource, setVideoSource] = useState<string | null>(null);

  useEffect(() => {
    if (currentLetter) {
      getLocalVideoUri(currentLetter).then((uri) => {
        setVideoSource(uri);
      });
    }
  }, [currentLetter]);

  const player = useVideoPlayer(videoSource ? { uri: videoSource } : null, (p) => {
    p.loop = false;
    p.muted = false;
    // Videoni 6-soniyadan boshlash (intro qismini o'tkazib yuborish)
    p.currentTime = 6;
  });

  // ── Sync refs ─────────────────────────────────────────────
  useEffect(() => { letterIdxRef.current = letterIdx; }, [letterIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isCheckingRef.current = isChecking; }, [isChecking]);

  // ── Animations ────────────────────────────────────────────
  const animateCardIn = () => {
    cardOpacity.setValue(0);
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const showFeedback = (type: 'success' | 'fail') => {
    setFeedback(type);
    feedbackOp.setValue(0);

    // Haptic feedback
    triggerHaptic(type);

    // Sticker burst
    if (stickerTimerRef.current) clearTimeout(stickerTimerRef.current);
    setStickerBurst({ visible: false, type });
    requestAnimationFrame(() => {
      setStickerBurst({ visible: true, type });
    });
    stickerTimerRef.current = setTimeout(() => {
      setStickerBurst({ visible: false, type });
    }, type === 'success' ? 1600 : 1200);

    Animated.sequence([
      Animated.timing(feedbackOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(type === 'success' ? 1100 : 900),
      Animated.timing(feedbackOp, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setFeedback('none'));
  };

  const animateLetterDone = () => {
    congratsScale.setValue(0);
    starRotate.setValue(0);
    Animated.parallel([
      Animated.spring(congratsScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
      Animated.timing(starRotate, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  // ── Branding done → start video or skip to pronunciation ──
  const handleBrandingDone = async () => {
    setShowBranding(false);
    
    let source = videoSource;
    if (!source) {
      source = await getLocalVideoUri(currentLetter);
    }

    if (source) {
      try {
        player.replace({ uri: source });
        player.currentTime = 6;
        player.play();
      } catch (e) {
        console.warn('[Lesson] Play failed:', e);
        setVideoErrored(true);
        skipToPronounce();
      }
    } else {
      skipToPronounce();
    }
  };

  const skipToPronounce = () => {
    setPhase('pronounce');
    phaseRef.current = 'pronounce';
    animateCardIn();
    setTimeout(() => speakLetter(), 500);
  };

  // ── Phase transitions ─────────────────────────────────────
  const goToPhase = (p: Phase) => {
    setPhase(p);
    phaseRef.current = p;
    setIsRecording(false);
    setRecognizedText('');
    setIsChecking(false);
    isCheckingRef.current = false;
    lastInterimRef.current = '';
    setVideoErrored(false);

    if (p === 'video') {
      // Show branding intro before video
      setShowBranding(true);
    } else if (p === 'pronounce') {
      animateCardIn();
      setTimeout(() => speakLetter(), 500);
    } else if (p === 'word') {
      animateCardIn();
      setTimeout(() => speakWord(), 500);
    } else if (p === 'letterDone') {
      animateLetterDone();
      playSound('success');
    }
  };

  // ── Video end handler ─────────────────────────────────────
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      if (phaseRef.current === 'video') {
        setPhase('pronounce');
        phaseRef.current = 'pronounce';
        animateCardIn();
        setTimeout(() => speakLetter(), 500);
      }
    });
    const errSub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'error' && phaseRef.current === 'video') {
        setVideoErrored(true);
        // Auto-skip to pronunciation
        setTimeout(() => {
          setPhase('pronounce');
          phaseRef.current = 'pronounce';
          animateCardIn();
          setTimeout(() => speakLetter(), 500);
        }, 500);
      }
    });
    return () => { sub.remove(); errSub.remove(); };
  }, [player]);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
    goToPhase('video');
  }, []);

  // ── Speech helpers ────────────────────────────────────────
  const speakLetter = () => {
    const step = stepsRef.current[letterIdxRef.current];
    if (step) Speech.speak(step.letter, { language: 'en-US', rate: 0.75, pitch: 1.1 });
  };

  const speakWord = () => {
    const step = stepsRef.current[letterIdxRef.current];
    if (step) Speech.speak(step.word.en, { language: 'en-US', rate: 0.7, pitch: 1.05 });
  };

  // ── Recording ─────────────────────────────────────────────
  const startRecording = () => {
    if (isCheckingRef.current) return;
    setIsRecording(true);
    setRecognizedText('');
    setIsChecking(false);
    isCheckingRef.current = false;
    lastInterimRef.current = '';
    playSound('click');
    Animated.spring(micScale, { toValue: 1.5, useNativeDriver: true }).start();

    const step = stepsRef.current[letterIdxRef.current];
    const isPronounce = phaseRef.current === 'pronounce';
    const expected = isPronounce ? step.letter : step.word.en;
    const ctx: string[] = [expected];
    if (isPronounce) {
      const phonetics = LETTER_PHONETICS[expected.toLowerCase()];
      if (phonetics) ctx.push(...phonetics);
    }

    const settings = getSettings();
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      maxAlternatives: 5,
      contextualStrings: ctx,
      requiresOnDeviceRecognition: settings.offlineRecognition,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'web_search',
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
      },
      iosTaskHint: 'confirmation',
    });
  };

  const stopRecording = () => {
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
  };

  // ── Check pronunciation ───────────────────────────────────
  const checkPronunciation = (recognized: string) => {
    const step = stepsRef.current[letterIdxRef.current];
    if (!step || !recognized.trim()) {
      setIsChecking(false);
      isCheckingRef.current = false;
      return;
    }
    const isPronounce = phaseRef.current === 'pronounce';
    const expected = isPronounce ? step.letter : step.word.en;
    let ok = false;

    if (isPronounce) {
      ok = matchesLetter(recognized, expected);
    } else {
      const nr = normalize(recognized);
      const ne = normalize(expected);
      ok = nr.includes(ne) || ne.includes(nr) || similarity(recognized, expected) >= 0.45;
    }

    if (ok) {
      showFeedback('success');
      playSound('magic');
      setTimeout(() => {
        setIsChecking(false);
        isCheckingRef.current = false;
        if (isPronounce) {
          goToPhase('word');
        } else {
          goToPhase('letterDone');
        }
      }, 1400);
    } else {
      showFeedback('fail');
      playSound('pop');
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  };

  // ── Speech recognition events ─────────────────────────────
  useSpeechRecognitionEvent('result', (event) => {
    const all = event.results
      .map((r) => r?.transcript ?? '')
      .filter((t) => t.length > 0);
    const raw = all[0] ?? '';
    const cleaned = cleanTranscript(raw);
    setRecognizedText(cleaned || raw);
    if (cleaned) lastInterimRef.current = cleaned;

    if (event.isFinal && !isCheckingRef.current) {
      isCheckingRef.current = true;
      setIsChecking(true);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

      const isPronounce = phaseRef.current === 'pronounce';
      const step = stepsRef.current[letterIdxRef.current];
      const expected = isPronounce ? step?.letter ?? '' : step?.word.en ?? '';
      const candidates = all.map(cleanTranscript);
      const chosen = pickBestMatch(candidates, expected, isPronounce);
      checkPronunciation(chosen || cleaned);
    }
  });

  useSpeechRecognitionEvent('error', (ev) => {
    const interim = lastInterimRef.current;
    if (
      !isCheckingRef.current && interim &&
      (ev.error === 'no-speech' || ev.error === 'speech-timeout')
    ) {
      isCheckingRef.current = true;
      setIsChecking(true);
      checkPronunciation(interim);
    }
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  useSpeechRecognitionEvent('end', () => {
    const interim = lastInterimRef.current;
    if (!isCheckingRef.current && interim) {
      isCheckingRef.current = true;
      setIsChecking(true);
      checkPronunciation(interim);
    }
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  // ── Advance to next letter or victory ─────────────────────
  const advanceLetter = () => {
    const next = letterIdxRef.current + 1;
    if (next < steps.length) {
      letterIdxRef.current = next;
      setLetterIdx(next);
      goToPhase('video');
    } else {
      handleVictory();
    }
  };

  // ── Victory ───────────────────────────────────────────────
  const handleVictory = async () => {
    setIsVictory(true);
    setPhase('victory');
    phaseRef.current = 'victory';
    playSound('victory');
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (raw) {
        const u = JSON.parse(raw);
        u.progress = Math.max(u.progress || 1, lessonId + 1);
        await AsyncStorage.setItem('user_data', JSON.stringify(u));
        await API.updateProgress(u.progress);
      }
    } catch {}
    setTimeout(() => {
      router.replace({
        pathname: '/dashboard',
        params: { unlockedLesson: String(lessonId + 1) },
      });
    }, 4200);
  };

  // ── Back confirmation ─────────────────────────────────────
  const handleBack = () => {
    Alert.alert(
      t('exitLessonTitle'),
      t('exitLessonMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('exitBtn'),
          style: 'destructive',
          onPress: () => router.replace('/dashboard'),
        },
      ],
    );
  };

  // ── Derived values ────────────────────────────────────────
  const step = steps[letterIdx];
  const totalPhases = steps.length * 3; // video+pronounce+word per letter
  const donePhases =
    letterIdx * 3 +
    (phase === 'video' ? 0 : phase === 'pronounce' ? 1 : phase === 'word' ? 2 : 3);
  const progress = Math.min((donePhases / totalPhases) * 100, 100);

  const starSpin = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bgColors: [string, string, string] = ['#1B3A7A', '#2E67B8', '#5DADE2'];

  // ── RENDER ────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.progressCard}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]}>
              <LinearGradient colors={[palette.gold, palette.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </View>
          </View>
          <Text style={s.progressText}>
            {t('letterLabel')}: {step?.letter}  •  {letterIdx + 1}/{steps.length}
          </Text>
        </View>
      </View>

      {/* ── VIDEO PHASE ─────────────────────────────────── */}
      {phase === 'video' && (
        <View style={[s.phaseContainer, { backgroundColor: '#000' }]}>
          {videoSource && !videoErrored ? (
            <>
              <VideoView
                style={{ flex: 1, width: '100%' }}
                player={player}
                contentFit="contain"
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={false}
              />
              <SmartSpeechWatermark />
              <TouchableOpacity
                style={[s.skipBtn, { position: 'absolute', bottom: 30, right: 30 }]}
                onPress={() => {
                  try { player.pause(); } catch {}
                  setPhase('pronounce');
                  phaseRef.current = 'pronounce';
                  animateCardIn();
                  setTimeout(() => speakLetter(), 500);
                }}
              >
                <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
                <Text style={s.skipTxt}>{t('skipBtn')} ⏭</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[s.center, { flex: 1 }]}>
              <Text style={{ fontSize: 100 }}>🎬</Text>
              <Text style={[s.loadTxt, { marginTop: 16 }]}>
                {step?.letter} {t('videoComingSoon')}
              </Text>
              <TouchableOpacity
                style={[s.skipBtn, { marginTop: 20 }]}
                onPress={() => {
                  setPhase('pronounce');
                  phaseRef.current = 'pronounce';
                  animateCardIn();
                  setTimeout(() => speakLetter(), 500);
                }}
              >
                <LinearGradient colors={[palette.gold, palette.sunDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
                <Text style={s.skipTxt}>{t('continueBtn')} ▶</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── PRONOUNCE PHASE ─────────────────────────────── */}
      {phase === 'pronounce' && step && (
        <View style={s.phaseContainer}>
          <View style={s.contentRow}>
            {/* Letter card */}
            <Animated.View style={[s.letterCard, { opacity: cardOpacity }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(255,248,225,0.98)']}
                style={[StyleSheet.absoluteFill, { borderRadius: radius.xl + 4 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <TouchableOpacity style={s.listenBtn} onPress={speakLetter} activeOpacity={0.8}>
                <LinearGradient colors={[palette.gold, palette.sunDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
                <Text style={{ fontSize: 26 }}>🔊</Text>
              </TouchableOpacity>
              <Text style={s.bigLetter} adjustsFontSizeToFit numberOfLines={1}>
                {step.letter}
              </Text>
              <Text style={s.phaseLabel}>{t('sayThisLetter')}</Text>
            </Animated.View>

            {/* Mic area */}
            <View style={s.rightPanel}>
              <Animated.View style={[s.feedbackBox, { opacity: feedbackOp }]}>
                {feedback === 'success' ? (
                  <>
                    <LinearGradient colors={[palette.mint, palette.mintDeep]} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
                    <Text style={s.fbText}>{t('correct')} ⭐</Text>
                  </>
                ) : feedback === 'fail' ? (
                  <>
                    <LinearGradient colors={[palette.coral, palette.coralDeep]} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
                    <Text style={s.fbText}>{t('tryAgain')} 🔄</Text>
                  </>
                ) : (
                  <Text style={{ color: 'transparent', fontSize: 20 }}> </Text>
                )}
              </Animated.View>
              {renderMic()}
              {/* Web uchun — mikrofon ishlamasa, bosib o'tish mumkin */}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[s.skipBtn, { marginTop: 16 }]}
                  onPress={() => {
                    showFeedback('success');
                    playSound('magic');
                    setTimeout(() => goToPhase('word'), 1400);
                  }}
                >
                  <LinearGradient colors={[palette.mint, palette.mintDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
                  <Text style={s.skipTxt}>✅ {t('correct')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── STICKER BURST OVERLAY ──────────────────────── */}
      <StickerBurst visible={stickerBurst.visible} type={stickerBurst.type} />

      {/* ── WORD PHASE ──────────────────────────────────── */}
      {phase === 'word' && step && (
        <View style={s.phaseContainer}>
          <View style={s.contentRow}>
            <Animated.View style={[s.letterCard, { opacity: cardOpacity }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(230,245,255,0.98)']}
                style={[StyleSheet.absoluteFill, { borderRadius: radius.xl + 4 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <TouchableOpacity style={s.listenBtn} onPress={speakWord} activeOpacity={0.8}>
                <LinearGradient colors={[palette.sky, palette.skyDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
                <Text style={{ fontSize: 26 }}>🔊</Text>
              </TouchableOpacity>

              {/* Big emoji illustration */}
              <Text style={s.wordEmoji}>
                {WORD_EMOJIS[step.word.en.toLowerCase()] || '📝'}
              </Text>

              <Text style={s.wordEn} adjustsFontSizeToFit numberOfLines={1}>
                {step.word.en}
              </Text>

              {/* Highlighted letter inside the word */}
              <View style={s.letterHighlightRow}>
                {step.word.en.split('').map((ch, ci) => (
                  <Text
                    key={ci}
                    style={[
                      s.wordCharacter,
                      ch.toLowerCase() === step.letter.toLowerCase() && s.wordCharacterHighlight,
                    ]}
                  >
                    {ch}
                  </Text>
                ))}
              </View>

              <View style={s.translationChip}>
                <Text style={s.wordUz}>🇺🇿 {step.word.uz}</Text>
              </View>
              <Text style={s.phaseLabel}>{t('sayThisWord')}</Text>
            </Animated.View>

            <View style={s.rightPanel}>
              <Animated.View style={[s.feedbackBox, { opacity: feedbackOp }]}>
                {feedback === 'success' ? (
                  <>
                    <LinearGradient colors={[palette.mint, palette.mintDeep]} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
                    <Text style={s.fbText}>{t('correct')} ⭐</Text>
                  </>
                ) : feedback === 'fail' ? (
                  <>
                    <LinearGradient colors={[palette.coral, palette.coralDeep]} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
                    <Text style={s.fbText}>{t('tryAgain')} 🔄</Text>
                  </>
                ) : (
                  <Text style={{ color: 'transparent', fontSize: 20 }}> </Text>
                )}
              </Animated.View>
              {renderMic()}
            </View>
          </View>
        </View>
      )}

      {/* ── LETTER DONE — mini congrats ─────────────────── */}
      {phase === 'letterDone' && step && (
        <View style={[s.phaseContainer, s.center]}>
          <Animated.View style={{ transform: [{ scale: congratsScale }], alignItems: 'center' }}>
            <Animated.Text style={[s.congratsStar, { transform: [{ rotate: starSpin }] }]}>
              ⭐
            </Animated.Text>
            <Text style={s.congratsTitle}>{t('greatJob')}</Text>
            <Text style={s.congratsSub}>
              {step.letter} — {t('letterCompleted')}
            </Text>
            <TouchableOpacity
              style={s.nextBtn}
              onPress={advanceLetter}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={letterIdx < steps.length - 1 ? ['#6BCB77', '#2ECC71'] : [palette.gold, '#FFB800']}
                style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
              />
              <Text style={s.nextTxt}>
                {letterIdx < steps.length - 1
                  ? `${t('nextLetter')}: ${steps[letterIdx + 1]?.letter} →`
                  : `${t('finishLesson')} 🏆`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ── Victory overlay ─────────────────────────────── */}
      <VictoryOverlay
        visible={isVictory}
        title={t('amazing')}
        subtitle={`${t('lesson')} ${lessonId} ${t('completed')}`}
        icon="🏆"
      />

      {/* ── Branding intro before each letter video ───── */}
      {showBranding && phase === 'video' && (
        <BrandingIntro onFinish={handleBrandingDone} />
      )}
    </View>
  );

  // ── Shared mic renderer ───────────────────────────────────
  function renderMic() {
    return (
      <View style={s.micArea}>
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.9}
        >
          <Animated.View style={[s.micBtn, { transform: [{ scale: micScale }] }]}>
            <LinearGradient
              colors={isRecording ? ['#FF6B6B', '#E03E3E'] : [palette.sky, palette.skyDeep]}
              style={[StyleSheet.absoluteFill, { borderRadius: 70 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Text style={{ fontSize: 56 }}>🎙️</Text>
          </Animated.View>
        </TouchableOpacity>
        <Text style={s.micTxt}>
          {isChecking
            ? t('checking')
            : isRecording
              ? t('listening')
              : t('holdToSpeak')}
        </Text>
        {recognizedText ? (
          <View style={s.transcriptPill}>
            <Text style={s.recTxt}>&quot;{recognizedText}&quot;</Text>
          </View>
        ) : null}
      </View>
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadTxt: { color: '#FFF', fontSize: 22, textAlign: 'center', fontWeight: '700' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    zIndex: 10,
  },
  backBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
    ...shadowFx.soft,
  },
  backIcon: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: -2 },
  progressCard: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  progressTrack: {
    height: 10, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  progressText: {
    color: '#FFF', fontSize: 12, fontWeight: '800',
    marginTop: 4, letterSpacing: 1,
  },

  // Phase container
  phaseContainer: { flex: 1 },
  contentRow: {
    flex: 1, flexDirection: 'row',
    alignItems: 'stretch', justifyContent: 'space-evenly',
    padding: spacing.lg,
  },

  // Letter card
  letterCard: {
    width: '46%',
    borderRadius: radius.xl + 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    ...shadowFx.lifted,
  },
  bigLetter: {
    fontSize: 160, fontWeight: '900', color: palette.ink,
    textShadowColor: 'rgba(255,200,70,0.35)',
    textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 14,
    textAlign: 'center',
  },
  phaseLabel: {
    fontSize: 14, fontWeight: '800', color: palette.inkSoft,
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 8,
  },
  wordEmoji: {
    fontSize: 72, textAlign: 'center', marginBottom: 4,
  },
  wordEn: {
    fontSize: 48, fontWeight: '900', color: palette.ink,
    textAlign: 'center', letterSpacing: 1,
  },
  letterHighlightRow: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 6,
  },
  wordCharacter: {
    fontSize: 28, fontWeight: '800', color: 'rgba(0,0,0,0.25)',
    letterSpacing: 3,
  },
  wordCharacterHighlight: {
    color: palette.coral, fontSize: 32, fontWeight: '900',
    textShadowColor: 'rgba(255,107,107,0.35)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  wordUz: { fontSize: 20, color: palette.inkSoft, fontWeight: '700' },
  translationChip: {
    marginTop: 10, paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(47,128,237,0.12)',
    borderWidth: 1.2, borderColor: 'rgba(47,128,237,0.35)',
  },
  listenBtn: {
    position: 'absolute', top: 18, right: 18,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', ...shadowFx.soft,
  },

  // Right panel (mic + feedback)
  rightPanel: {
    width: '46%',
    alignItems: 'center', justifyContent: 'center',
  },
  feedbackBox: {
    minHeight: 54, paddingHorizontal: spacing.xl,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: radius.lg, overflow: 'hidden',
    ...shadowFx.soft,
  },
  fbText: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  micArea: { alignItems: 'center', marginTop: spacing.xl },
  micBtn: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.55)',
    ...shadowFx.lifted,
  },
  micTxt: {
    marginTop: 18, color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  transcriptPill: {
    marginTop: 14, paddingHorizontal: spacing.lg, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  recTxt: {
    color: 'rgba(255,255,255,0.95)', fontSize: 13,
    fontStyle: 'italic', textAlign: 'center', fontWeight: '600',
  },

  // Letter done congrats
  congratsStar: { fontSize: 80, textAlign: 'center' },
  congratsTitle: {
    fontSize: 36, fontWeight: '900', color: palette.gold,
    marginTop: 10, letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  congratsSub: {
    fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)',
    marginTop: 8, letterSpacing: 1,
  },
  nextBtn: {
    marginTop: 28, paddingHorizontal: 36, paddingVertical: 16,
    borderRadius: 30, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    ...shadowFx.lifted,
  },
  nextTxt: {
    fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: 1,
  },

  // Skip / continue button
  skipBtn: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  skipTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

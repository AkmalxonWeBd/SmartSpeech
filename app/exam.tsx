import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { playSound } from '../utils/soundProvider';
import { API } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Letter phonetics map for matching
const LETTER_PHONETICS: Record<string, string[]> = {
  a: ['a', 'ay', 'hey', 'eh', 'aye', 'aa', 'ah'],
  b: ['b', 'be', 'bee', 'bees', 'beef', 'beat'],
  c: ['c', 'see', 'sea', 'si', 'seed', 'seen', 'she'],
  d: ['d', 'de', 'dee', 'did', 'the', 'deep', 'deal'],
  e: ['e', 'ee', 'he', 'each', 'eat', 'ease', 'east'],
  f: ['f', 'ef', 'eff', 'if', 'of', 'off', 'half'],
  g: ['g', 'ge', 'gee', 'ji', 'jee', 'jeep', 'gene'],
  h: ['h', 'age', 'ache', 'aitch', 'each', 'hey', 'hate', 'eight', 'ate'],
  i: ['i', 'eye', 'ai', 'aye', 'hi', 'ice'],
  j: ['j', 'jay', 'je', 'jae', 'day', 'jade', 'jail', 'jane'],
  k: ['k', 'kay', 'ke', 'key', 'ok', 'okay', 'cake', 'kate'],
  l: ['l', 'el', 'ell', 'ale', 'all', 'ill', 'elle'],
  m: ['m', 'em', 'am', 'him', 'mm', 'hmm', 'them'],
  n: ['n', 'en', 'in', 'an', 'and', 'end'],
  o: ['o', 'oh', 'oo', 'ooh', 'owe', 'own'],
  p: ['p', 'pe', 'pee', 'pea', 'pi', 'peace', 'piece', 'peak'],
  q: ['q', 'queue', 'cue', 'cu', 'que', 'cute', 'few'],
  r: ['r', 'are', 'ar', 'our', 'or', 'err', 'her'],
  s: ['s', 'es', 'yes', 'as', 'is', 'us', 'ass', 'ace'],
  t: ['t', 'te', 'tea', 'tee', 'ti', 'the', 'tree', 'teeth'],
  u: ['u', 'you', 'yu', 'yew', 'hue', 'who', 'ooh', 'ew'],
  v: ['v', 've', 'vee', 'vi', 'we', 'fee', 'free', 'vie'],
  w: ['w', 'double you', 'double u', 'doubleyou', 'dub', 'double'],
  x: ['x', 'ex', 'ax', 'eggs', 'acts', 'axe'],
  y: ['y', 'why', 'wie', 'wi', 'wye', 'wise'],
  z: ['z', 'zee', 'zed', 'ze', 'said', 'set', 'sit'],
};

// Confetti
function ConfettiPiece({ delay, x, screenH, screenW }: { delay: number; x: number; screenH: number; screenW: number }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF5733', '#C70039'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 8 + Math.random() * 14;
  const isCircle = Math.random() > 0.5;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: screenH + 100, duration: 3000 + Math.random() * 2000, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: (Math.random() - 0.5) * 200, duration: 3000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(2500),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: size, height: size * (isCircle ? 1 : 0.6),
      backgroundColor: color,
      borderRadius: isCircle ? size / 2 : 2,
      transform: [{ translateY }, { translateX }, { rotate: spin }],
      opacity,
    }} />
  );
}

// Firework burst
function FireworkBurst({ x, y, delay }: { x: number; y: number; delay: number }) {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return { tx: Math.cos(angle) * 120, ty: Math.sin(angle) * 120 };
  });
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF5733', '#DDA0DD'];

  useEffect(() => {
    setTimeout(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: x, top: y,
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: colors[i % colors.length],
          opacity,
          transform: [
            { translateX: Animated.multiply(scale, p.tx) as any },
            { translateY: Animated.multiply(scale, p.ty) as any },
            { scale: Animated.subtract(1, Animated.multiply(scale, 0.5)) as any },
          ],
        }} />
      ))}
    </>
  );
}

export default function ExamScreen() {
  const { width: SW, height: SH } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail'>('none');
  const [failCount, setFailCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const currentIndexRef = useRef(0);
  const isCheckingRef = useRef(false);
  const failCountRef = useRef(0);

  const itemScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;

  // Victory animations
  const victoryScale = useRef(new Animated.Value(0)).current;
  const victoryRotate = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(100)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
    animateItemIn();
  }, []);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isCheckingRef.current = isChecking; }, [isChecking]);
  useEffect(() => { failCountRef.current = failCount; }, [failCount]);

  const normalize = (t: string) => t.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

  const cleanTranscript = (text: string): string => {
    return text.replace(/\benglish\b/gi, '').replace(/\s+/g, ' ').trim();
  };

  const matchesLetter = (recognized: string, letter: string): boolean => {
    const nr = normalize(recognized);
    const ll = letter.toLowerCase();
    const phonetics = LETTER_PHONETICS[ll] || [ll];
    for (const v of phonetics) {
      if (nr === v || nr.includes(v)) return true;
      if (nr.split(' ').some(w => w === v)) return true;
    }
    if (nr.includes(ll)) return true;
    return false;
  };

  // Track best interim so we can fall back if final never arrives.
  const lastInterimRef = useRef<string>('');

  // Speech events
  useSpeechRecognitionEvent('result', (event) => {
    const allTranscripts = event.results
      .map((r) => r?.transcript ?? '')
      .filter((t) => t.length > 0);
    const raw = allTranscripts[0] ?? '';
    const cleaned = cleanTranscript(raw);
    setRecognizedText(cleaned || raw);
    if (cleaned) lastInterimRef.current = cleaned;

    if (event.isFinal && !isCheckingRef.current) {
      isCheckingRef.current = true;
      setIsChecking(true);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

      const letter = ALL_LETTERS[currentIndexRef.current];
      if (letter) {
        // Try every alternative against the expected letter
        const candidates = allTranscripts.map(cleanTranscript);
        const chosen = candidates.find((c) => matchesLetter(c, letter)) ?? candidates[0] ?? cleaned;
        checkPronunciation(chosen, letter);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('[exam] speech error:', event.error, event.message);
    const letter = ALL_LETTERS[currentIndexRef.current];
    const interim = lastInterimRef.current;
    if (
      !isCheckingRef.current &&
      letter &&
      interim &&
      (event.error === 'no-speech' || event.error === 'speech-timeout')
    ) {
      isCheckingRef.current = true;
      setIsChecking(true);
      checkPronunciation(interim, letter);
    }
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  const animateItemIn = () => {
    itemScale.setValue(0);
    Animated.spring(itemScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
    // NO auto-speak in exam mode!
  };

  const startRecording = async () => {
    if (isChecking) return;
    try {
      setIsRecording(true);
      setRecognizedText('');
      setIsChecking(false);
      isCheckingRef.current = false;
      playSound('click');
      Animated.spring(micScale, { toValue: 1.5, useNativeDriver: true }).start();

      const letter = ALL_LETTERS[currentIndex];
      const phonetics = LETTER_PHONETICS[letter.toLowerCase()] || [];

      lastInterimRef.current = '';
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 5,
        contextualStrings: [letter, ...phonetics],
        // Critical for recognising single letters on Android.
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'web_search',
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        },
        iosTaskHint: 'confirmation',
      });
    } catch (err) {
      console.error('Exam speech error', err);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const stopRecording = () => {
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
  };

  const checkPronunciation = (recognized: string, letter: string) => {
    const isMatch = matchesLetter(recognized, letter);
    console.log(`[Exam] expected="${letter}" recognized="${recognized}" match=${isMatch}`);

    if (isMatch) {
      showFeedback('success');
      playSound('success');
      setTimeout(() => {
        setIsChecking(false);
        isCheckingRef.current = false;
        handleNext();
      }, 1000);
    } else {
      const nf = failCountRef.current + 1;
      setFailCount(nf);
      failCountRef.current = nf;
      showFeedback('fail');
      playSound('error');
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  };

  const showFeedback = (type: 'success' | 'fail') => {
    setFeedback(type);
    feedbackOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setFeedback('none'));
  };

  const handleNext = () => {
    setFailCount(0);
    const next = currentIndexRef.current + 1;
    if (next < ALL_LETTERS.length) {
      currentIndexRef.current = next;
      setCurrentIndex(next);
      animateItemIn();
    } else {
      handleVictory();
    }
  };

  const handleVictory = async () => {
    setIsVictory(true);
    playSound('victory');

    // Epic animation sequence
    Animated.sequence([
      Animated.spring(victoryScale, { toValue: 1, friction: 3, tension: 15, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(starScale, { toValue: 1, friction: 4, tension: 20, useNativeDriver: true }),
        Animated.timing(victoryRotate, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(badgeSlide, { toValue: 0, friction: 5, tension: 30, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Update level to A1, reset progress for new level
    try {
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.level = 'a1';
        user.progress = 1; // Reset progress for the new level
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        await API.syncUser({ name: user.name, age: user.age, level: 'a1' });
        await API.updateProgress(1);
      }
    } catch (e) {
      console.error('Failed to update level', e);
    }

    setTimeout(() => {
      router.replace('/dashboard');
    }, 8000);
  };

  if (isVictory) {
    const confetti = Array.from({ length: 120 }, (_, i) => ({
      id: i, x: Math.random() * SW, delay: Math.random() * 2000,
    }));
    const fireworks = [
      { x: SW * 0.2, y: SH * 0.15, delay: 500 },
      { x: SW * 0.8, y: SH * 0.2, delay: 1200 },
      { x: SW * 0.5, y: SH * 0.1, delay: 2000 },
      { x: SW * 0.3, y: SH * 0.25, delay: 2800 },
      { x: SW * 0.7, y: SH * 0.15, delay: 3500 },
    ];
    const spin = victoryRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
      <View style={[s.container, { backgroundColor: '#0A0A2E', overflow: 'hidden' }]}>
        <LinearGradient colors={['#0A0A2E', '#1A1A4E', '#2D1B69']} style={StyleSheet.absoluteFill} />

        {confetti.map(c => (
          <ConfettiPiece key={c.id} x={c.x} delay={c.delay} screenH={SH} screenW={SW} />
        ))}
        {fireworks.map((f, i) => (
          <FireworkBurst key={i} {...f} />
        ))}

        <View style={s.victoryCenter}>
          {/* Big trophy */}
          <Animated.View style={{ transform: [{ scale: victoryScale }] }}>
            <Animated.Text style={[s.victoryEmoji, { transform: [{ rotate: spin }] }]}>🏆</Animated.Text>
          </Animated.View>

          {/* Stars */}
          <Animated.View style={[s.starsRow, { transform: [{ scale: starScale }] }]}>
            <Text style={s.starEmoji}>⭐</Text>
            <Text style={[s.starEmoji, { fontSize: 50, marginBottom: 10 }]}>🌟</Text>
            <Text style={s.starEmoji}>⭐</Text>
          </Animated.View>

          {/* Congratulations text */}
          <Animated.View style={[s.congratsBox, { transform: [{ scale: Animated.multiply(victoryScale, pulseAnim) }] }]}>
            <Text style={s.congratsTitle}>TABRIKLAYMIZ! 🎉</Text>
            <Text style={s.congratsSubtitle}>Siz BEGINNER darajasini tugatdingiz!</Text>
          </Animated.View>

          {/* A1 Badge */}
          <Animated.View style={[s.a1Badge, { transform: [{ translateY: badgeSlide }, { scale: pulseAnim }], opacity: badgeOpacity }]}>
            <LinearGradient colors={['#FFD700', '#FFA500', '#FF8C00']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={s.a1Text}>A1</Text>
            <Text style={s.a1Label}>YANGI DARAJA</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  const currentLetter = ALL_LETTERS[currentIndex];
  const progress = ((currentIndex) / ALL_LETTERS.length) * 100;

  return (
    <LinearGradient colors={['#1A0A2E', '#2D1B69', '#4A235A']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>📝 IMTIHON</Text>
        <Text style={s.headerSub}>{currentIndex + 1} / {ALL_LETTERS.length}</Text>
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={[s.progressBar, { width: `${progress}%` }]} />
      </View>

      <View style={s.content}>
        {/* Letter Card — NO replay button */}
        <Animated.View style={[s.letterCard, { transform: [{ scale: itemScale }] }]}>
          <Text style={s.letterText} adjustsFontSizeToFit numberOfLines={1}>{currentLetter}</Text>
        </Animated.View>

        <View style={s.rightPanel}>
          {/* Feedback */}
          <Animated.View style={[s.feedbackBox, { opacity: feedbackOpacity }]}>
            {feedback === 'success' ? (
              <Text style={s.successText}>To'g'ri! ⭐</Text>
            ) : feedback === 'fail' ? (
              <Text style={s.failText}>Noto'g'ri! 🔄</Text>
            ) : (
              <Text style={s.placeholderText}> </Text>
            )}
          </Animated.View>

          {/* Mic */}
          <View style={s.micArea}>
            <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} activeOpacity={0.9}>
              <Animated.View style={[s.micBtn, isRecording && s.micBtnRec, { transform: [{ scale: micScale }] }]}>
                <Text style={s.micIcon}>🎙️</Text>
              </Animated.View>
            </TouchableOpacity>
            <Text style={s.micText}>
              {isChecking ? "Tekshirilmoqda..." : isRecording ? "Eshitilmoqda..." : "Bosib turib ayting"}
            </Text>
            {recognizedText ? <Text style={s.recText}>"{recognizedText}"</Text> : null}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingTop: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
  headerSub: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  progressWrap: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 30, marginTop: 10, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#FFD700', borderRadius: 4 },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', padding: 20 },
  letterCard: {
    width: '40%', height: '75%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFD700',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  letterText: { fontSize: 140, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(255,215,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 15, textAlign: 'center' },
  rightPanel: { width: '45%', height: '80%', alignItems: 'center', justifyContent: 'center' },
  feedbackBox: { height: 50, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  placeholderText: { fontSize: 20 },
  successText: { color: '#2ECC71', fontSize: 24, fontWeight: 'bold' },
  failText: { color: '#E74C3C', fontSize: 22, fontWeight: 'bold' },
  micArea: { alignItems: 'center', marginTop: 30 },
  micBtn: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#8E44AD', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8E44AD', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10,
    borderWidth: 4, borderColor: '#6C3483',
  },
  micBtnRec: { backgroundColor: '#E74C3C', borderColor: '#C0392B', shadowColor: '#E74C3C' },
  micIcon: { fontSize: 45 },
  micText: { marginTop: 16, color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  recText: { marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  // Victory
  victoryCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  victoryEmoji: { fontSize: 100 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  starEmoji: { fontSize: 36 },
  congratsBox: { marginTop: 20, alignItems: 'center' },
  congratsTitle: { fontSize: 38, fontWeight: '900', color: '#FFD700', textShadowColor: 'rgba(255,215,0,0.5)', textShadowRadius: 20, textShadowOffset: { width: 0, height: 3 }, letterSpacing: 3 },
  congratsSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: '600' },
  a1Badge: {
    marginTop: 30, width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 4, borderColor: '#FFF',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 20,
  },
  a1Text: { fontSize: 42, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
  a1Label: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 2 },
});

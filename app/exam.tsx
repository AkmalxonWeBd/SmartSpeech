import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { playSound } from '../utils/soundProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wordsDB: WordsEntry[] = require('../assets/data/words.json');
import VictoryOverlay from '../components/VictoryOverlay';
import { palette, radius, shadowFx, spacing } from '../utils/theme';

type Word = { en: string; uz: string };
type WordsEntry = { level: string; lesson: number; words: Word[] };

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Phonetic matcher for single-letter utterances (beginner exam).
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

const normalize = (t: string) =>
  t.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

const cleanTranscript = (text: string): string =>
  text.replace(/\benglish\b/gi, '').replace(/\s+/g, ' ').trim();

const similarity = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) {
    if (na.includes(nb) || nb.includes(na)) return 0.8;
    return 0;
  }
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.substring(i, i + 2);
      m.set(bi, (m.get(bi) || 0) + 1);
    }
    return m;
  };
  const b1 = bigrams(na);
  const b2 = bigrams(nb);
  let mt = 0;
  b1.forEach((c, bi) => {
    mt += Math.min(c, b2.get(bi) || 0);
  });
  return (2 * mt) / (na.length - 1 + nb.length - 1);
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Word pool builder: for A1 exam pull words across all A1 lessons;
// for A2 pull across both A1 + A2 lessons. Ensures every lesson is
// represented (2 random words / lesson) for reasonable test length.
function buildWordPool(level: 'a1' | 'a2'): Word[] {
  const srcLevels = level === 'a1' ? ['A1'] : ['A1', 'A2'];
  const perLesson = 2;
  const pool: Word[] = [];
  for (const lv of srcLevels) {
    const entries = wordsDB.filter((e) => e.level.toUpperCase() === lv);
    entries.sort((a, b) => a.lesson - b.lesson);
    for (const entry of entries) {
      const picks = shuffle(entry.words).slice(0, perLesson);
      pool.push(...picks);
    }
  }
  // Deduplicate by english word (case-insensitive).
  const seen = new Set<string>();
  const unique = pool.filter((w) => {
    const k = w.en.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return shuffle(unique);
}

type Mode = 'letters' | 'words';
type Item = { kind: 'letter'; letter: string } | { kind: 'word'; word: Word };

export default function ExamScreen() {
  const params = useLocalSearchParams();
  const { width: SW } = useWindowDimensions();

  const [userLevel, setUserLevel] = useState<string>('beginner');
  const examLevel = String(params.level || userLevel || 'beginner').toLowerCase();
  const mode: Mode = examLevel === 'beginner' ? 'letters' : 'words';

  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail'>('none');
  const [isChecking, setIsChecking] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const currentIndexRef = useRef(0);
  const isCheckingRef = useRef(false);
  const itemsRef = useRef<Item[]>([]);

  const itemScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const lastInterimRef = useRef<string>('');

  // Load user level + build items.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) {
          const u = JSON.parse(raw);
          setUserLevel((u.level || 'beginner').toLowerCase());
        }
      } catch (_) {}
    })();
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }, []);

  // Build items once we know the resolved level.
  useEffect(() => {
    let next: Item[];
    if (mode === 'letters') {
      next = ALL_LETTERS.map((l) => ({ kind: 'letter', letter: l }));
    } else {
      const pool = buildWordPool(examLevel === 'a2' ? 'a2' : 'a1');
      next = pool.map((w) => ({ kind: 'word', word: w }));
    }
    itemsRef.current = next;
    setItems(next);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    animateItemIn();
  }, [mode, examLevel]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    isCheckingRef.current = isChecking;
  }, [isChecking]);

  const matchesLetter = (recognized: string, letter: string): boolean => {
    const nr = normalize(recognized);
    const ll = letter.toLowerCase();
    const phonetics = LETTER_PHONETICS[ll] || [ll];
    for (const v of phonetics) {
      if (nr === v || nr.includes(v)) return true;
      if (nr.split(' ').some((w) => w === v)) return true;
    }
    if (nr.includes(ll)) return true;
    return false;
  };

  const matchesWord = (recognized: string, expected: string): boolean => {
    const nr = normalize(recognized);
    const ne = normalize(expected);
    if (!nr) return false;
    if (nr === ne) return true;
    if (nr.includes(ne) || ne.includes(nr)) return true;
    return similarity(recognized, expected) >= 0.5;
  };

  const pickBest = (candidates: string[], expected: string, isLetter: boolean): string => {
    if (!candidates.length) return '';
    let best = candidates[0];
    let bestScore = -1;
    for (const c of candidates) {
      const score = isLetter
        ? matchesLetter(c, expected)
          ? 1
          : 0
        : (normalize(c).includes(normalize(expected)) ||
            normalize(expected).includes(normalize(c)))
          ? 1
          : similarity(c, expected);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  };

  useSpeechRecognitionEvent('result', (event) => {
    const all = event.results.map((r) => r?.transcript ?? '').filter((t) => t.length > 0);
    const raw = all[0] ?? '';
    const cleaned = cleanTranscript(raw);
    setRecognizedText(cleaned || raw);
    if (cleaned) lastInterimRef.current = cleaned;

    if (event.isFinal && !isCheckingRef.current) {
      const item = itemsRef.current[currentIndexRef.current];
      if (!item) {
        setIsRecording(false);
        Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
        return;
      }
      isCheckingRef.current = true;
      setIsChecking(true);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

      if (item.kind === 'letter') {
        const candidates = all.map(cleanTranscript);
        const chosen = pickBest(candidates, item.letter, true);
        checkResult(chosen || cleaned);
      } else {
        const candidates = all.map(cleanTranscript);
        const chosen = pickBest(candidates, item.word.en, false);
        checkResult(chosen || cleaned);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('[exam] speech error:', event.error, event.message);
    const interim = lastInterimRef.current;
    const item = itemsRef.current[currentIndexRef.current];
    if (
      !isCheckingRef.current &&
      item &&
      interim &&
      (event.error === 'no-speech' || event.error === 'speech-timeout')
    ) {
      isCheckingRef.current = true;
      setIsChecking(true);
      checkResult(interim);
    }
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  useSpeechRecognitionEvent('end', () => {
    const interim = lastInterimRef.current;
    const item = itemsRef.current[currentIndexRef.current];
    if (!isCheckingRef.current && item && interim) {
      isCheckingRef.current = true;
      setIsChecking(true);
      checkResult(interim);
    }
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  const animateItemIn = () => {
    itemScale.setValue(0);
    Animated.spring(itemScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const startRecording = async () => {
    if (isChecking) return;
    const item = items[currentIndex];
    if (!item) return;
    try {
      setIsRecording(true);
      setRecognizedText('');
      setIsChecking(false);
      isCheckingRef.current = false;
      playSound('click');
      Animated.spring(micScale, { toValue: 1.5, useNativeDriver: true }).start();

      const ctx: string[] =
        item.kind === 'letter'
          ? [item.letter, ...(LETTER_PHONETICS[item.letter.toLowerCase()] || [])]
          : [item.word.en];

      lastInterimRef.current = '';
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 5,
        contextualStrings: ctx,
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
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (_) {}
  };

  const checkResult = (recognized: string) => {
    const item = itemsRef.current[currentIndexRef.current];
    if (!item) {
      setIsChecking(false);
      isCheckingRef.current = false;
      return;
    }
    const ok =
      item.kind === 'letter'
        ? matchesLetter(recognized, item.letter)
        : matchesWord(recognized, item.word.en);

    if (ok) {
      showFeedback('success');
      playSound('success');
      setTimeout(() => {
        setIsChecking(false);
        isCheckingRef.current = false;
        advance();
      }, 1000);
    } else {
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

  const speakCurrent = () => {
    const item = itemsRef.current[currentIndexRef.current];
    if (!item) return;
    const text = item.kind === 'letter' ? item.letter : item.word.en;
    Speech.speak(text, { language: 'en-US', rate: 0.75, pitch: 1.0 });
  };

  const advance = () => {
    const next = currentIndexRef.current + 1;
    if (next < itemsRef.current.length) {
      currentIndexRef.current = next;
      setCurrentIndex(next);
      animateItemIn();
    } else {
      handleVictory();
    }
  };

  /**
   * On success: advance the user's level. beginner→a1, a1→a2.
   * A2 exam is the final one — we mark progress past 13 but keep level=a2.
   */
  const handleVictory = async () => {
    setIsVictory(true);
    playSound('victory');

    let nextLevel: string | null = null;
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (raw) {
        const u = JSON.parse(raw);
        if (examLevel === 'beginner') {
          nextLevel = 'a1';
          u.level = 'a1';
          u.progress = 1;
        } else if (examLevel === 'a1') {
          nextLevel = 'a2';
          u.level = 'a2';
          u.progress = 1;
        } else {
          // A2 is the final stage — keep level, mark as graduated.
          nextLevel = null;
          u.level = 'a2';
          u.progress = 14;
        }
        await AsyncStorage.setItem('user_data', JSON.stringify(u));
      }
    } catch (e) {
      console.error('Failed to update level', e);
    }

    // Give the victory overlay time to breathe, then return to
    // dashboard. Pass `unlockedLesson=1` when the level changes so
    // dashboard auto-scrolls to the first wagon of the new level and
    // plays its reveal animation.
    setTimeout(() => {
      if (nextLevel) {
        router.replace({
          pathname: '/dashboard',
          params: { unlockedLesson: '1', levelUp: nextLevel },
        });
      } else {
        router.replace('/dashboard');
      }
    }, 4200);
  };

  const item = items[currentIndex];
  const progress = items.length ? (currentIndex / items.length) * 100 : 0;

  // ── Victory overlay state ─────────────────────────────────────────
  const victoryConfig = (() => {
    if (examLevel === 'beginner') {
      return {
        title: "TABRIKLAYMIZ!",
        subtitle: "Beginner darajasi tugadi — A1 boshlanmoqda",
        badge: 'A1',
      };
    }
    if (examLevel === 'a1') {
      return {
        title: 'TABRIKLAYMIZ!',
        subtitle: 'A1 darajasi tugadi — A2 boshlanmoqda',
        badge: 'A2',
      };
    }
    return {
      title: 'AJOYIB!',
      subtitle: 'Siz A2 darajasini ham tugatdingiz',
      badge: null as string | null,
    };
  })();

  const examBg: [string, string, string] = examLevel === 'beginner'
    ? ['#1B3A7A', '#2E67B8', '#5DADE2']
    : examLevel === 'a1'
      ? ['#0E2B5F', '#2F80ED', '#6CB8FF']
      : ['#1A0842', '#4B1082', '#A55BD1'];

  return (
    <View style={s.container}>
      <LinearGradient colors={examBg} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}/>

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={()=>router.replace('/dashboard')} activeOpacity={0.85}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>
            📝 {examLevel === 'beginner' ? 'IMTIHON' : `${examLevel.toUpperCase()} IMTIHON`}
          </Text>
          <Text style={s.headerSub}>
            {items.length ? `${currentIndex + 1} / ${items.length}` : '…'}
          </Text>
        </View>
        <View style={s.headerSpacer}/>
      </View>

      <View style={s.progressWrap}>
        <View style={[s.progressBar, { width: `${progress}%` }]}>
          <LinearGradient colors={[palette.gold, palette.coral]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill}/>
        </View>
      </View>

      <View style={s.content}>
        {/* Prompt card */}
        {item ? (
          <Animated.View style={[s.letterCard, { transform: [{ scale: itemScale }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.98)','rgba(255,248,225,0.98)']}
              style={[StyleSheet.absoluteFill,{borderRadius:radius.xl+4}]}
              start={{x:0,y:0}} end={{x:1,y:1}}
            />
            {item.kind === 'letter' ? (
              <Text style={s.letterText} adjustsFontSizeToFit numberOfLines={1}>
                {item.letter}
              </Text>
            ) : (
              <View style={{ alignItems: 'center', padding: 12 }}>
                <Text style={s.wordUz} adjustsFontSizeToFit numberOfLines={2}>
                  🇺🇿 {item.word.uz}
                </Text>
                <Text style={s.wordHint}>Inglizchasini ayting</Text>
                <TouchableOpacity style={s.listenBtn} onPress={speakCurrent} activeOpacity={0.85}>
                  <LinearGradient colors={[palette.gold, palette.sunDeep]} style={[StyleSheet.absoluteFill,{borderRadius:30}]}/>
                  <Text style={{ fontSize: 28 }}>🔊</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        ) : null}

        <View style={s.rightPanel}>
          <Animated.View style={[s.feedbackBox, { opacity: feedbackOpacity }]}>
            {feedback === 'success' ? (
              <>
                <LinearGradient colors={[palette.mint, palette.mintDeep]} style={[StyleSheet.absoluteFill,{borderRadius:radius.lg}]}/>
                <Text style={s.successText}>To&apos;g&apos;ri! ⭐</Text>
              </>
            ) : feedback === 'fail' ? (
              <>
                <LinearGradient colors={[palette.coral, palette.coralDeep]} style={[StyleSheet.absoluteFill,{borderRadius:radius.lg}]}/>
                <Text style={s.failText}>Noto&apos;g&apos;ri! 🔄</Text>
              </>
            ) : (
              <Text style={s.placeholderText}> </Text>
            )}
          </Animated.View>

          <View style={s.micArea}>
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.9}
            >
              <Animated.View
                style={[
                  s.micBtn,
                  { transform: [{ scale: micScale }] },
                ]}
              >
                <LinearGradient
                  colors={isRecording ? ['#FF6B6B','#E03E3E'] : [palette.violet, '#6B2BAE']}
                  style={[StyleSheet.absoluteFill,{borderRadius:70}]}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                />
                <Text style={s.micIcon}>🎙️</Text>
              </Animated.View>
            </TouchableOpacity>
            <Text style={s.micText}>
              {isChecking
                ? 'Tekshirilmoqda…'
                : isRecording
                  ? 'Eshitilmoqda…'
                  : 'Bosib turib ayting'}
            </Text>
            {recognizedText ? (
              <View style={s.transcriptPill}>
                <Text style={s.recText}>&quot;{recognizedText}&quot;</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <VictoryOverlay
        visible={isVictory}
        title={victoryConfig.title}
        subtitle={victoryConfig.subtitle}
        badge={victoryConfig.badge}
        icon="🏆"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
    ...shadowFx.soft,
  },
  backIcon: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: -2 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 44 },
  headerTitle: {
    fontSize: 20, fontWeight: '900', color: palette.gold, letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  headerSub: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 2, letterSpacing: 1 },
  progressWrap: {
    height: 10, marginHorizontal: spacing.lg, marginTop: 10,
    borderRadius: 5, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  content: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-evenly',
    padding: spacing.lg,
  },
  letterCard: {
    width: '46%', height: '80%',
    borderRadius: radius.xl + 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    ...shadowFx.lifted,
  },
  letterText: {
    fontSize: 160, fontWeight: '900', color: palette.ink,
    textShadowColor: 'rgba(255,200,70,0.35)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 14,
    textAlign: 'center',
  },
  wordUz: {
    fontSize: 44, fontWeight: '900', color: palette.ink, textAlign: 'center',
  },
  wordHint: {
    marginTop: 16, fontSize: 13, color: palette.inkSoft,
    fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase',
  },
  listenBtn: {
    marginTop: 20, width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...shadowFx.soft,
  },
  rightPanel: { width: '46%', height: '80%', alignItems: 'center', justifyContent: 'center' },
  feedbackBox: {
    minHeight: 54, paddingHorizontal: spacing.xl,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: radius.lg, overflow: 'hidden',
    ...shadowFx.soft,
  },
  placeholderText: { fontSize: 20, color: 'transparent' },
  successText: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  failText: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  micArea: { alignItems: 'center', marginTop: spacing.lg },
  micBtn: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    ...shadowFx.lifted,
  },
  micIcon: { fontSize: 56 },
  micText: {
    marginTop: 16, fontSize: 16, color: '#FFF', fontWeight: '700', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  transcriptPill: {
    marginTop: 12, paddingHorizontal: spacing.lg, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  recText: {
    fontSize: 13, color: 'rgba(255,255,255,0.95)', fontStyle: 'italic',
    fontWeight: '600', textAlign: 'center',
  },
});

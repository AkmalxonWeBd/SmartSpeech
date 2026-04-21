import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { getLettersForLesson } from '../../utils/alphabetData';
import { API } from '../../utils/api';
import { playSound } from '../../utils/soundProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom Confetti Component
function ConfettiParticle({ delay, x, screenHeight }: { delay: number; x: number; screenHeight: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const colors = ['#FFC300', '#FF5733', '#C70039', '#900C3F', '#581845', '#3498DB', '#2ECC71'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 10 + Math.random() * 15;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight + 50,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x,
      top: 0,
      width: size,
      height: size,
      backgroundColor: color,
      transform: [{ translateY }, { rotate: spin }, { skewX: spin }]
    }} />
  );
}

type QueueItem = 
  | { type: 'letter'; text: string }
  | { type: 'word'; text: string; translation: string; letter: string };

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const lessonId = parseInt(id as string, 10);
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail'>('none');
  const [failCount, setFailCount] = useState(0);
  const [isVictory, setIsVictory] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [phase, setPhase] = useState<'letters' | 'words'>('letters');
  const [loadingWords, setLoadingWords] = useState(false);

  // Store lesson letters for later use when fetching words
  const lessonLettersRef = useRef<string[]>([]);

  // Animations
  const itemScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;

  // Use refs to access current values inside event callbacks
  const queueRef = useRef<QueueItem[]>([]);
  const currentIndexRef = useRef(0);
  const failCountRef = useRef(0);
  const isCheckingRef = useRef(false);
  const phaseRef = useRef<'letters' | 'words'>('letters');

  // Keep refs in sync with state
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { failCountRef.current = failCount; }, [failCount]);
  useEffect(() => { isCheckingRef.current = isChecking; }, [isChecking]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    loadLessonData();
    // Request speech recognition permissions
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }, [lessonId]);

  // Strip filler words like "english" that the user says to make utterances longer
  const cleanTranscript = (text: string): string => {
    return text
      .replace(/\benglish\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // --- Speech Recognition Event Handlers ---
  useSpeechRecognitionEvent('result', (event) => {
    const rawTranscript = event.results[0]?.transcript ?? '';
    const currentItem = queueRef.current[currentIndexRef.current];

    // Only strip "english" during the letter phase
    const isLetterItem = currentItem?.type === 'letter';
    const transcript = isLetterItem ? cleanTranscript(rawTranscript) : rawTranscript;
    setRecognizedText(transcript || rawTranscript);

    if (event.isFinal && !isCheckingRef.current) {
      // Final result received — check pronunciation
      isCheckingRef.current = true;
      setIsChecking(true);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();

      if (currentItem) {
        checkPronunciation(transcript, currentItem.text);
      } else {
        isCheckingRef.current = false;
        setIsChecking(false);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error, event.message);
    setIsRecording(false);
    setIsChecking(false);
    isCheckingRef.current = false;
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
  });

  const loadLessonData = async () => {
    const letters = getLettersForLesson(lessonId);
    if (!letters || letters.length === 0) {
      router.back();
      return;
    }

    // Save letters for later word fetching
    lessonLettersRef.current = letters;

    // Phase 1: Only letters in the queue
    const initialQueue: QueueItem[] = letters.map(l => ({ type: 'letter', text: l }));
    setQueue(initialQueue);
    setPhase('letters');
    setLoading(false);
    animateItemIn();
  };

  // Load words for Phase 2 after letters are done
  const loadWordsPhase = async () => {
    setLoadingWords(true);
    try {
      const letters = lessonLettersRef.current;
      console.log('[loadWordsPhase] Fetching words for letters:', letters);
      const wordsData = await API.getWords(letters);
      console.log('[loadWordsPhase] API response:', JSON.stringify(wordsData));

      const wordQueue: QueueItem[] = [];
      letters.forEach(letter => {
        // Try both cases since API might return uppercase keys
        const letterWords = wordsData[letter] || wordsData[letter.toUpperCase()] || wordsData[letter.toLowerCase()] || [];
        console.log(`[loadWordsPhase] Letter "${letter}" -> ${letterWords.length} words`);
        letterWords.forEach((w: any) => {
          wordQueue.push({ type: 'word', text: w.en, translation: w.uz, letter });
        });
      });

      if (wordQueue.length === 0) {
        console.warn('[loadWordsPhase] No words found, proceeding to victory');
        setLoadingWords(false);
        handleVictory();
        return;
      }

      console.log(`[loadWordsPhase] Loaded ${wordQueue.length} words, starting Phase 2`);
      queueRef.current = wordQueue; // Update ref immediately
      currentIndexRef.current = 0;  // Update ref immediately
      setQueue(wordQueue);
      setCurrentIndex(0);
      setPhase('words');
      phaseRef.current = 'words';
      setLoadingWords(false);
      animateItemIn();
    } catch (e) {
      console.error('[loadWordsPhase] Failed to load words:', e);
      setLoadingWords(false);
      // Don't call handleVictory on error — stay on screen
      // Try to proceed without words
      handleVictory();
    }
  };

  const animateItemIn = () => {
    itemScale.setValue(0);
    Animated.spring(itemScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true
    }).start();
    
    // Auto speak when it appears
    setTimeout(speakCurrentItem, 500);
  };

  const speakCurrentItem = () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (q.length === 0 || idx >= q.length) return;
    const current = q[idx];
    Speech.speak(current.text, { language: 'en-US', rate: 0.8, pitch: 1.1 });
  };

  // --- Letter phonetics map ---
  // Speech engines hear "B" as "bee", "C" as "see", etc.
  // Each letter maps to all common ways the engine might transcribe it
  const LETTER_PHONETICS: Record<string, string[]> = {
    a: ['a', 'ay', 'hey', 'eh', 'aye', 'aa', 'ah'],
    b: ['b', 'be', 'bee', 'bee', 'bees', 'beef', 'beat'],
    c: ['c', 'see', 'sea', 'si', 'seed', 'seen', 'she'],
    d: ['d', 'de', 'dee', 'did', 'the', 'deep', 'deal'],
    e: ['e', 'ee', 'he', 'each', 'eat', 'ease', 'east'],
    f: ['f', 'ef', 'eff', 'if', 'of', 'off', 'half'],
    g: ['g', 'ge', 'gee', 'ji', 'jee', 'jeep', 'gene'],
    h: ['h', 'age', 'ache', 'aitch', 'each', 'hey', 'hate', 'eight', 'ate'],
    i: ['i', 'eye', 'ai', 'aye', 'hi', 'ice', 'I'],
    j: ['j', 'jay', 'je', 'jae', 'day', 'jade', 'jail', 'jane'],
    k: ['k', 'kay', 'ke', 'key', 'ok', 'okay', 'cake', 'kate'],
    l: ['l', 'el', 'ell', 'ale', 'all', 'ill', 'elle'],
    m: ['m', 'em', 'am', 'him', 'mm', 'hmm', 'them'],
    n: ['n', 'en', 'in', 'an', 'and', 'end'],
    o: ['o', 'oh', 'oo', 'ooh', 'owe', 'own'],
    p: ['p', 'pe', 'pee', 'pea', 'pi', 'pee', 'peace', 'piece', 'peak'],
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

  // --- Normalize text for comparison ---
  const normalize = (text: string) =>
    text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

  // Simple similarity score (Dice coefficient on bigrams)
  const similarity = (a: string, b: string): number => {
    const na = normalize(a);
    const nb = normalize(b);
    if (na === nb) return 1;
    if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

    const bigrams = (s: string) => {
      const set = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const bi = s.substring(i, i + 2);
        set.set(bi, (set.get(bi) || 0) + 1);
      }
      return set;
    };

    const bg1 = bigrams(na);
    const bg2 = bigrams(nb);
    let matches = 0;
    bg1.forEach((count, bi) => {
      matches += Math.min(count, bg2.get(bi) || 0);
    });
    return (2 * matches) / (na.length - 1 + nb.length - 1);
  };

  // Check if recognized text matches a single letter via phonetics
  const matchesLetterPhonetically = (recognized: string, letter: string): boolean => {
    const normalizedRec = normalize(recognized);
    const letterLower = letter.toLowerCase();
    const phonetics = LETTER_PHONETICS[letterLower] || [letterLower];

    // Direct check: does recognized text match or contain any phonetic variant?
    for (const variant of phonetics) {
      if (normalizedRec === variant) return true;
      if (normalizedRec.includes(variant)) return true;
      // Also check if the variant is contained as a word
      const words = normalizedRec.split(' ');
      if (words.some(w => w === variant)) return true;
    }

    // Also check if the letter itself appears anywhere
    if (normalizedRec.includes(letterLower)) return true;

    return false;
  };

  const startRecording = async () => {
    if (isChecking) return; // Don't start if we're still checking
    try {
      setIsRecording(true);
      setRecognizedText('');
      setIsChecking(false);
      isCheckingRef.current = false;
      playSound('click');
      Animated.spring(micScale, { toValue: 1.5, useNativeDriver: true }).start();

      const currentItem = queue[currentIndex];
      
      // Build contextual strings: include the letter/word + its phonetic variants
      let contextStrings: string[] = [];
      if (currentItem) {
        contextStrings.push(currentItem.text);
        if (currentItem.type === 'letter') {
          const phonetics = LETTER_PHONETICS[currentItem.text.toLowerCase()];
          if (phonetics) contextStrings.push(...phonetics);
        }
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 5,
        // Bias the recognizer towards the expected text and its phonetics
        contextualStrings: contextStrings,
      });
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsRecording(false);
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const stopRecording = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error('Failed to stop speech recognition', err);
    }
  };

  const checkPronunciation = (recognized: string, expectedText: string) => {
    const isLetter = expectedText.length <= 2;
    let isMatch = false;

    if (isLetter) {
      // For letters: use phonetic matching (english is already stripped by cleanTranscript)
      isMatch = matchesLetterPhonetically(recognized, expectedText);
    } else {
      // For words: check actual pronunciation
      const score = similarity(recognized, expectedText);
      const normalizedRec = normalize(recognized);
      const normalizedExp = normalize(expectedText);
      isMatch = normalizedRec.includes(normalizedExp) ||
                normalizedExp.includes(normalizedRec) ||
                score >= 0.5;
    }

    console.log(`[Speech Check] expected="${expectedText}" recognized="${recognized}" isLetter=${isLetter} match=${isMatch}`);

    if (isMatch) {
      showFeedback('success');
      playSound('success');
      setTimeout(() => {
        setIsChecking(false);
        isCheckingRef.current = false;
        handleNextItem();
      }, 1500);
    } else {
      const newFailCount = failCountRef.current + 1;
      setFailCount(newFailCount);
      failCountRef.current = newFailCount;
      showFeedback('fail');
      playSound('error');
      setIsChecking(false);
      isCheckingRef.current = false;

      if (newFailCount % 3 === 0) {
        setTimeout(speakCurrentItem, 1000);
      }
    }
  };

  const showFeedback = (type: 'success' | 'fail') => {
    setFeedback(type);
    feedbackOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => setFeedback('none'));
  };

  const handleNextItem = () => {
    setFailCount(0);
    const nextIndex = currentIndexRef.current + 1;
    console.log(`[handleNextItem] nextIndex=${nextIndex}, queueLength=${queueRef.current.length}, phase=${phaseRef.current}`);
    if (nextIndex < queueRef.current.length) {
      currentIndexRef.current = nextIndex; // Update ref immediately for speakCurrentItem
      setCurrentIndex(nextIndex);
      animateItemIn();
    } else if (phaseRef.current === 'letters') {
      // Letters done → load words for Phase 2
      console.log('[handleNextItem] All letters done, loading words...');
      loadWordsPhase();
    } else {
      // Words done → Victory!
      console.log('[handleNextItem] All words done, victory!');
      handleVictory();
    }
  };

  const handleVictory = async () => {
    setIsVictory(true);
    playSound('victory'); // Assumes victory sound exists
    
    // Animate victory text
    itemScale.setValue(0);
    Animated.spring(itemScale, {
      toValue: 1,
      friction: 4,
      tension: 10,
      useNativeDriver: true
    }).start();
    
    // Update progress in API / LocalStorage
    try {
      const userStr = await AsyncStorage.getItem('user_data');
      let progress = 1; // Base progress
      if (userStr) {
        const user = JSON.parse(userStr);
        progress = Math.max(user.progress || 1, lessonId + 1);
        await API.updateProgress(progress);
        user.progress = progress;
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      }
    } catch (e) {
      console.error('Could not save progress', e);
    }

    // Go back to dashboard after animation
    setTimeout(() => {
      // Pass a parameter to trigger the dashboard unlock animation
      router.replace({ pathname: '/', params: { unlockedLesson: lessonId + 1 } });
    }, 4000);
  };

  if (loading || loadingWords) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.loadingText}>
          {loadingWords ? "So'zlar yuklanmoqda..." : "Yuklanmoqda..."}
        </Text>
      </View>
    );
  }

  if (isVictory) {
    const confettiArray = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_W,
      delay: Math.random() * 1500,
    }));

    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFD700', overflow: 'hidden' }]}>
        {confettiArray.map(c => (
          <ConfettiParticle key={c.id} x={c.x} delay={c.delay} screenHeight={SCREEN_H} />
        ))}
        <Animated.Text style={[styles.victoryText, { transform: [{ scale: itemScale }] }]}>OFAARIN! 🎉</Animated.Text>
      </View>
    );
  }

  const currentItem = queue[currentIndex];
  if (!currentItem) return null;

  return (
    <LinearGradient colors={['#1B2631', '#2E4053']} style={styles.container}>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(currentIndex / queue.length) * 100}%` }]} />
      </View>
      
      <View style={styles.content}>
        <Animated.View style={[styles.itemCard, { transform: [{ scale: itemScale }] }]}>
          
          <TouchableOpacity style={styles.replayBtn} onPress={speakCurrentItem}>
            <Text style={styles.replayIcon}>🔊</Text>
          </TouchableOpacity>

          {currentItem.type === 'letter' ? (
            <Text style={styles.hugeText} adjustsFontSizeToFit numberOfLines={1}>{currentItem.text}</Text>
          ) : (
            <View style={styles.wordContainer}>
              <Text style={styles.wordText} adjustsFontSizeToFit numberOfLines={1}>{currentItem.text}</Text>
              <Text style={styles.translationText} adjustsFontSizeToFit numberOfLines={1}>{currentItem.translation}</Text>
            </View>
          )}

        </Animated.View>

        <View style={styles.rightPanel}>
          {/* Feedback Message */}
          <Animated.View style={[styles.feedbackContainer, { opacity: feedbackOpacity }]}>
            {feedback === 'success' ? (
              <Text style={styles.successText}>Zo'r! ⭐</Text>
            ) : feedback === 'fail' ? (
              <Text style={styles.failText}>Yana urunib ko'ring! 🔄</Text>
            ) : (
              <Text style={styles.placeholderText}> </Text> 
            )}
          </Animated.View>

          {/* Microphone Button */}
          <View style={styles.micArea}>
            <TouchableOpacity 
              onPressIn={startRecording} 
              onPressOut={stopRecording}
              activeOpacity={0.9}
            >
              <Animated.View style={[
                styles.micButton, 
                isRecording && styles.micButtonRecording,
                { transform: [{ scale: micScale }] }
              ]}>
                <Text style={styles.micIcon}>🎙️</Text>
              </Animated.View>
            </TouchableOpacity>
            <Text style={styles.micInstruction}>
              {isChecking ? "Tekshirilmoqda..." : isRecording ? "Eshitilmoqda..." : "Bosib turib gapiring"}
            </Text>
            {recognizedText ? (
              <Text style={styles.recognizedText}>
                "{recognizedText}"
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { color: '#FFF', fontSize: 24, textAlign: 'center' },
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 20,
    marginHorizontal: 40,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#48C9B0',
    borderRadius: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: 20
  },
  itemCard: {
    width: '45%',
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  hugeText: {
    fontSize: 140,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  wordContainer: {
    alignItems: 'center'
  },
  wordText: {
    fontSize: 50,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  translationText: {
    fontSize: 22,
    color: '#AAB7B8',
    marginTop: 10,
  },
  replayBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayIcon: {
    fontSize: 28,
  },
  rightPanel: {
    width: '45%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micArea: {
    alignItems: 'center',
    marginTop: 30,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3498DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#2980B9',
  },
  micButtonRecording: {
    backgroundColor: '#E74C3C',
    borderColor: '#C0392B',
    shadowColor: '#E74C3C',
  },
  micIcon: {
    fontSize: 50,
  },
  micInstruction: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: '600',
  },
  feedbackContainer: {
    height: 60,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  placeholderText: { fontSize: 24 },
  successText: { color: '#2ECC71', fontSize: 28, fontWeight: 'bold' },
  failText: { color: '#E74C3C', fontSize: 24, fontWeight: 'bold' },
  recognizedText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  victoryText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  }
});

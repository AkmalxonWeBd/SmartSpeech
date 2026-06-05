import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, useWindowDimensions, Keyboard, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';
import { playSound } from '../utils/soundProvider';
import { AppSettings, loadSettings, saveSettings, getSettings } from '../utils/settingsManager';
import VictoryOverlay from '../components/VictoryOverlay';
import { palette, radius, shadowFx, spacing } from '../utils/theme';
import { normalize, similarity, cleanTranscript, shuffle } from '../utils/textUtils';
import { pickBestMatch } from '../utils/letterPhonetics';
import { t } from '../utils/translations';

type Word = { en: string; uz: string };
type Phase = 'learn' | 'match' | 'speak' | 'dictation' | 'recall' | 'victory';
const PHASE_NAMES: Record<Phase, string> = {
  learn: `📖 ${t('learnPhase')}`,
  match: `🧩 ${t('matchPhase')}`,
  speak: `🎙️ ${t('speakPhase')}`,
  dictation: `✍️ ${t('dictPhase')}`,
  recall: `🧠 ${t('recallPhase')}`,
  victory: '',
};
const PHASE_ORDER: Phase[] = ['learn','match','speak','dictation','recall'];

export default function WordLessonScreen() {
  const params = useLocalSearchParams();
  const level = (params.level as string) || 'A1';
  const lessonNum = parseInt(params.lesson as string) || 1;
  const { width: SW, height: SH } = useWindowDimensions();

  // ── Fluid scale factors ────────────────────────────────────
  // Reference: 1024×600 landscape. Everything scales proportionally.
  const ws = SW / 1024;           // width scale
  const hs = SH / 600;            // height scale
  const fs = (ws + hs) / 2;       // font scale (balanced)
  const ms = Math.min(ws, hs);    // minimum scale (for square items)
  const w = (v: number) => Math.round(v * ws);
  const h = (v: number) => Math.round(v * hs);
  const f = (v: number) => Math.round(v * fs);
  const m = (v: number) => Math.round(v * ms);

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('learn');
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<'none'|'success'|'fail'>('none');
  // Match state
  const [matchQueue, setMatchQueue] = useState<Word[]>([]);
  const [matchOptions, setMatchOptions] = useState<string[]>([]);
  // Speak state
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  // Dictation state
  const [dictInput, setDictInput] = useState('');
  const [dictFails, setDictFails] = useState(0);
  const [showHint, setShowHint] = useState(false);
  // Recall state
  const [recallQueue, setRecallQueue] = useState<Word[]>([]);
  const [recallFails, setRecallFails] = useState<Record<string, number>>({});
  const [recalledCorrect, setRecalledCorrect] = useState<Record<string, boolean>>({});
  const [revealAnswer, setRevealAnswer] = useState<string | null>(null);

  const isCheckingRef = useRef(false);
  const idxRef = useRef(0);
  const phaseRef = useRef<Phase>('learn');
  const wordsRef = useRef<Word[]>([]);
  const matchQueueRef = useRef<Word[]>([]);
  const recallQueueRef = useRef<Word[]>([]);
  const scale = useRef(new Animated.Value(0)).current;
  const feedbackOp = useRef(new Animated.Value(0)).current;
  const micScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { matchQueueRef.current = matchQueue; }, [matchQueue]);
  useEffect(() => { recallQueueRef.current = recallQueue; }, [recallQueue]);
  const recallFailsRef = useRef<Record<string, number>>({});
  const recalledCorrectRef = useRef<Record<string, boolean>>({});
  useEffect(() => { recallFailsRef.current = recallFails; }, [recallFails]);
  useEffect(() => { recalledCorrectRef.current = recalledCorrect; }, [recalledCorrect]);
  useEffect(() => { isCheckingRef.current = isChecking; }, [isChecking]);

  useEffect(() => {
    (async () => {
      const w = await API.getLessonWords(level, lessonNum);
      if (!w.length) { router.back(); return; }
      setWords(w); wordsRef.current = w;
      setLoading(false);
      animIn();
    })();
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
  }, []);

  const animIn = () => { scale.setValue(0); Animated.spring(scale, { toValue:1, friction:5, tension:40, useNativeDriver:true }).start(); };
  const doShake = () => { Animated.sequence([
    Animated.timing(shakeX, {toValue:15, duration:50, useNativeDriver:true}),
    Animated.timing(shakeX, {toValue:-15, duration:50, useNativeDriver:true}),
    Animated.timing(shakeX, {toValue:10, duration:50, useNativeDriver:true}),
    Animated.timing(shakeX, {toValue:0, duration:50, useNativeDriver:true}),
  ]).start(); };

  const showFB = (type:'success'|'fail') => {
    setFeedback(type); feedbackOp.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackOp, {toValue:1, duration:200, useNativeDriver:true}),
      Animated.delay(600),
      Animated.timing(feedbackOp, {toValue:0, duration:200, useNativeDriver:true}),
    ]).start(() => setFeedback('none'));
  };

  const speakWord = (text: string) => Speech.speak(text, { language:'en-US', rate:0.75, pitch:1.1 });



  // --- Phase transitions ---
  const startPhase = (p: Phase) => {
    setPhase(p); phaseRef.current = p; setIdx(0); idxRef.current = 0;
    setFeedback('none'); setRecognizedText(''); setIsRecording(false); setIsChecking(false);
    isCheckingRef.current = false; setDictInput(''); setDictFails(0); setShowHint(false);
    if (p === 'match') {
      const q = shuffle(wordsRef.current);
      setMatchQueue(q); matchQueueRef.current = q;
      setupMatchOptions(q, 0);
    } else if (p === 'recall') {
      const q = shuffle(wordsRef.current);
      setRecallQueue(q); recallQueueRef.current = q;
      setRecallFails({}); recallFailsRef.current = {};
      setRecalledCorrect({}); recalledCorrectRef.current = {};
      setRevealAnswer(null);
    } else if (p === 'speak' || p === 'dictation') {
      setTimeout(() => speakWord(wordsRef.current[0]?.en || ''), 500);
    }
    animIn();
  };

  const nextPhase = () => {
    const ci = PHASE_ORDER.indexOf(phaseRef.current);
    if (ci < PHASE_ORDER.length - 1) startPhase(PHASE_ORDER[ci + 1]);
    else handleVictory();
  };

  // === LEARN ===
  const learnNext = () => {
    const ni = idxRef.current + 1;
    if (ni < wordsRef.current.length) {
      idxRef.current = ni; setIdx(ni); animIn();
      setTimeout(() => speakWord(wordsRef.current[ni].en), 400);
    } else nextPhase();
  };
  useEffect(() => { if (phase==='learn' && words.length && idx===0) setTimeout(()=>speakWord(words[0].en),500); }, [phase, words]);

  // === MATCH ===
  const setupMatchOptions = (q: Word[], i: number) => {
    const correct = q[i]; if(!correct) return;
    const others = wordsRef.current.filter(w => w.en !== correct.en);
    const wrong = shuffle(others).slice(0, 3).map(w => w.en);
    setMatchOptions(shuffle([correct.en, ...wrong]));
  };
  const handleMatchSelect = (selected: string) => {
    const q = matchQueueRef.current;
    const correct = q[idxRef.current];
    if (selected === correct.en) {
      showFB('success'); playSound('success');
      setTimeout(() => {
        const ni = idxRef.current + 1;
        if (ni < q.length) {
          idxRef.current = ni; setIdx(ni); setupMatchOptions(q, ni); animIn();
        } else nextPhase();
      }, 800);
    } else {
      showFB('fail'); playSound('error'); doShake();
      // Re-add to end
      const newQ = [...q, correct];
      setMatchQueue(newQ); matchQueueRef.current = newQ;
    }
  };

  // === SPEAK ===
  const lastInterimRef = useRef<string>('');



  useSpeechRecognitionEvent('result', (ev) => {
    const allTranscripts = ev.results
      .map((r) => r?.transcript ?? '')
      .filter((t) => t.length > 0);
    const t = allTranscripts[0] ?? '';
    setRecognizedText(t);
    if (t) lastInterimRef.current = t;
    if (ev.isFinal && !isCheckingRef.current) {
      isCheckingRef.current = true; setIsChecking(true); setIsRecording(false);
      Animated.spring(micScale, {toValue:1, useNativeDriver:true}).start();
      const p = phaseRef.current;
      if (p === 'speak') {
        const w = wordsRef.current[idxRef.current];
        if (w) {
          const chosen = pickBestMatch(allTranscripts, w.en, false);
          checkSpeak(chosen || allTranscripts[0] || '', w.en);
        }
      } else if (p === 'recall') {
        const w = recallQueueRef.current[idxRef.current];
        // Strip "english" filler word — user says "english sea" but means "sea"
        const stripFiller = (s: string) => s.replace(/\benglish\b/gi, '').replace(/\s+/g, ' ').trim();
        if (w) {
          const cleanedAlts = allTranscripts.map(stripFiller).filter(Boolean);
          const chosen = pickBestMatch(cleanedAlts, w.en, false);
          checkRecall(chosen || cleanedAlts[0] || allTranscripts[0] || '', w.en);
        }
      }
    }
  });
  useSpeechRecognitionEvent('error', (ev) => {
    console.warn('[word-lesson] speech error:', ev.error, ev.message);
    const interim = lastInterimRef.current;
    const p = phaseRef.current;
    if (
      !isCheckingRef.current &&
      interim &&
      (ev.error === 'no-speech' || ev.error === 'speech-timeout')
    ) {
      if (p === 'speak') {
        const w = wordsRef.current[idxRef.current];
        if (w) { isCheckingRef.current = true; setIsChecking(true); checkSpeak(interim, w.en); }
      } else if (p === 'recall') {
        const w = recallQueueRef.current[idxRef.current];
        if (w) { isCheckingRef.current = true; setIsChecking(true); checkRecall(interim, w.en); }
      }
    }
    setIsRecording(false); Animated.spring(micScale,{toValue:1,useNativeDriver:true}).start();
  });
  useSpeechRecognitionEvent('end', () => {
    const interim = lastInterimRef.current;
    const p = phaseRef.current;
    if (!isCheckingRef.current && interim) {
      if (p === 'speak') {
        const w = wordsRef.current[idxRef.current];
        if (w) { isCheckingRef.current = true; setIsChecking(true); checkSpeak(interim, w.en); }
      } else if (p === 'recall') {
        const w = recallQueueRef.current[idxRef.current];
        if (w) { isCheckingRef.current = true; setIsChecking(true); checkRecall(interim, w.en); }
      }
    }
    setIsRecording(false);
    Animated.spring(micScale, {toValue:1, useNativeDriver:true}).start();
  });

  const startRec = (contextWord: string) => {
    if (isCheckingRef.current) return;
    setIsRecording(true); setRecognizedText(''); setIsChecking(false); isCheckingRef.current=false;
    lastInterimRef.current = '';
    playSound('click');
    Animated.spring(micScale, {toValue:1.4, useNativeDriver:true}).start();
    // Provide ALL lesson words as context to bias the engine
    const allContext = wordsRef.current.map(w => w.en);
    const settings = getSettings();
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      maxAlternatives: 5,
      contextualStrings: [contextWord, ...allContext],
      requiresOnDeviceRecognition: settings.offlineRecognition,
      // Critical for short-word recognition on Android
      // (see https://issuetracker.google.com/issues/280288200#comment28)
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'web_search',
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
      },
      iosTaskHint: 'confirmation',
    });
  };
  const stopRec = () => { try{ExpoSpeechRecognitionModule.stop();}catch(_){} };

  const checkSpeak = (rec: string, expected: string) => {
    // If empty, don't penalize — just let user try again
    if (!rec.trim()) { setIsChecking(false); isCheckingRef.current=false; return; }
    const nr=normalize(rec), ne=normalize(expected);
    const ok = nr.includes(ne) || ne.includes(nr) || similarity(rec,expected) >= 0.45;
    if (ok) {
      showFB('success'); playSound('success');
      setTimeout(() => {
        setIsChecking(false); isCheckingRef.current=false;
        const ni=idxRef.current+1;
        if (ni<wordsRef.current.length) {
          idxRef.current=ni; setIdx(ni); animIn();
          setTimeout(()=>speakWord(wordsRef.current[ni].en),400);
        } else nextPhase();
      }, 800);
    } else { showFB('fail'); playSound('error'); doShake(); setIsChecking(false); isCheckingRef.current=false; }
  };

  // === DICTATION ===
  const checkDict = () => {
    Keyboard.dismiss();
    const w = wordsRef.current[idxRef.current];
    if (!w) return;
    // Accept both "walk" and "w a l k" formats
    const userInput = normalize(dictInput).replace(/\s/g, '');
    const expected = normalize(w.en).replace(/\s/g, '');
    if (userInput === expected) {
      showFB('success'); playSound('success');
      setTimeout(() => {
        setDictInput(''); setDictFails(0); setShowHint(false);
        const ni=idxRef.current+1;
        if (ni<wordsRef.current.length) {
          idxRef.current=ni; setIdx(ni); animIn();
          setTimeout(()=>speakWord(wordsRef.current[ni].en),400);
        } else nextPhase();
      }, 800);
    } else {
      const nf = dictFails+1; setDictFails(nf);
      if (nf>=3) setShowHint(true);
      showFB('fail'); playSound('error'); doShake();
    }
  };

  // === RECALL ===
  const advanceRecall = () => {
    const q = recallQueueRef.current;
    const ni = idxRef.current + 1;
    // Victory only if every unique word has been correctly recalled
    const total = wordsRef.current.length;
    const correctCount = Object.keys(recalledCorrectRef.current).filter(k => recalledCorrectRef.current[k]).length;
    if (ni >= q.length) {
      if (correctCount >= total) { handleVictory(); return; }
      // Not all recalled — re-queue missing words at the end
      const missing = wordsRef.current.filter(w => !recalledCorrectRef.current[normalize(w.en)]);
      if (missing.length === 0) { handleVictory(); return; }
      const nq = [...q, ...shuffle(missing)];
      setRecallQueue(nq); recallQueueRef.current = nq;
    }
    idxRef.current = ni; setIdx(ni); animIn();
  };

  const checkRecall = (rec: string, expected: string) => {
    if (!rec.trim()) { setIsChecking(false); isCheckingRef.current=false; return; }
    const nr=normalize(rec), ne=normalize(expected);
    const ok = nr.includes(ne) || ne.includes(nr) || similarity(rec,expected) >= 0.45;
    const key = normalize(expected);
    if (ok) {
      showFB('success'); playSound('success');
      const nc = { ...recalledCorrectRef.current, [key]: true };
      recalledCorrectRef.current = nc; setRecalledCorrect(nc);
      setTimeout(() => {
        setIsChecking(false); isCheckingRef.current=false;
        advanceRecall();
      }, 800);
    } else {
      const nfails = { ...recallFailsRef.current, [key]: (recallFailsRef.current[key] || 0) + 1 };
      recallFailsRef.current = nfails; setRecallFails(nfails);
      if (nfails[key] >= 3) {
        // Show correct answer, speak it, then move on (word will come back at end)
        showFB('fail'); playSound('error'); doShake();
        setRevealAnswer(expected);
        try { Speech.speak(expected, { language:'en-US', rate:0.7, pitch:1.05 }); } catch(_){}
        const q = recallQueueRef.current;
        const cur = q[idxRef.current];
        if (cur && !recalledCorrectRef.current[normalize(cur.en)]) {
          const nq = [...q, cur];
          setRecallQueue(nq); recallQueueRef.current = nq;
        }
        setTimeout(() => {
          setRevealAnswer(null);
          // Reset fails for this word so it gets fresh 3 attempts when it returns
          const resetFails = { ...recallFailsRef.current };
          delete resetFails[key];
          recallFailsRef.current = resetFails; setRecallFails(resetFails);
          setIsChecking(false); isCheckingRef.current=false;
          advanceRecall();
        }, 2600);
      } else {
        // Let user retry same word
        showFB('fail'); playSound('error'); doShake();
        setIsChecking(false); isCheckingRef.current=false;
      }
    }
  };

  // === VICTORY ===
  const handleVictory = async () => {
    setPhase('victory'); playSound('victory');
    animIn();
    let unlocked = lessonNum + 1;
    try {
      const us = await AsyncStorage.getItem('user_data');
      if (us) {
        const u = JSON.parse(us);
        const np = Math.max(u.progress||1, lessonNum+1);
        unlocked = np;
        u.progress = np;
        await AsyncStorage.setItem('user_data', JSON.stringify(u));
        await API.updateProgress(np);
      }
    } catch(_){}
    setTimeout(() => {
      router.replace({
        pathname: '/dashboard',
        params: { unlockedLesson: String(unlocked) },
      });
    }, 4200);
  };

  // ── Dynamic styles (scale with screen) ─────────────────────
  const ds = useMemo(() => {
    const _ws = SW / 1024;
    const _hs = SH / 600;
    const _fs = (_ws + _hs) / 2;
    const _ms = Math.min(_ws, _hs);
    const s = (v: number) => Math.round(v * _fs);
    const sw = (v: number) => Math.round(v * _ws);
    const sh = (v: number) => Math.round(v * _hs);
    const sm = (v: number) => Math.round(v * _ms);

    return StyleSheet.create({
      ctr: { flex: 1 },
      loadTxt: { color: '#fff', fontSize: s(18), textAlign: 'center', fontWeight: '700' },
      hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sw(20), paddingTop: sh(8), gap: sw(8) },
      backBtn: { width: sm(40), height: sm(40), borderRadius: sm(20), backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center', ...shadowFx.soft },
      backIcon: { color: '#FFF', fontSize: s(22), fontWeight: '900', marginTop: -2 },
      hdrBlock: { flex: 1, alignItems: 'center' },
      hdrSpacer: { width: sm(40) },
      hdrTitle: { fontSize: s(18), fontWeight: '900', color: palette.gold, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
      hdrSub: { fontSize: s(12), fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: sh(1), letterSpacing: 1 },
      progWrap: { height: sh(8), backgroundColor: 'rgba(0,0,0,0.18)', marginHorizontal: sw(20), marginTop: sh(6), borderRadius: s(4), overflow: 'hidden' as const, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
      progBar: { height: '100%' as any, borderRadius: s(4), overflow: 'hidden' as const },
      fbBox: { position: 'absolute' as const, top: '12%' as any, alignSelf: 'center' as const, zIndex: 99, paddingHorizontal: sw(24), paddingVertical: sh(8), borderRadius: s(20), backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', ...shadowFx.lifted },
      fbOk: { color: '#2ECC71', fontSize: s(18), fontWeight: 'bold' as const },
      fbFail: { color: '#E74C3C', fontSize: s(16), fontWeight: 'bold' as const },
      body: { flex: 1, padding: s(10) },
      bodyScroll: { flexGrow: 1, justifyContent: 'center' as const, alignItems: 'center' as const, paddingVertical: sh(8) },
      // Learn
      learnCard: { width: '90%' as any, maxWidth: sw(500), backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: s(20), padding: s(20), alignItems: 'center' as const, borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)' },
      learnEn: { fontSize: s(40), fontWeight: '900' as const, color: '#FFF', textShadowColor: 'rgba(255,215,0,0.4)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
      divider: { width: '60%' as any, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: sh(12) },
      learnUz: { fontSize: s(20), color: 'rgba(255,255,255,0.7)', fontWeight: '600' as const },
      learnBtns: { flexDirection: 'row' as const, marginTop: sh(16), gap: sw(12) },
      listenBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: s(18), paddingHorizontal: sw(16), paddingVertical: sh(10), flexDirection: 'row' as const, alignItems: 'center' as const, gap: sw(8), borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
      listenTxt: { color: 'rgba(255,255,255,0.8)', fontSize: s(13), fontWeight: '600' as const },
      nextBtn: { backgroundColor: '#FFD700', borderRadius: s(18), paddingHorizontal: sw(24), paddingVertical: sh(12) },
      nextTxt: { color: '#1a1a1a', fontSize: s(15), fontWeight: '800' as const },
      counter: { marginTop: sh(10), color: 'rgba(255,255,255,0.35)', fontSize: s(12) },
      // Match
      matchCard: { width: '92%' as any, maxWidth: sw(520), alignItems: 'center' as const },
      matchQ: { fontSize: s(26), fontWeight: '900' as const, color: '#FFF', marginBottom: sh(4) },
      matchHint: { fontSize: s(13), color: 'rgba(255,255,255,0.4)', marginBottom: sh(12) },
      optGrid: { width: '100%' as any, gap: sh(8) },
      optBtn: { paddingVertical: sh(12), paddingHorizontal: sw(16), borderRadius: s(14), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' as const },
      optTxt: { color: '#FFF', fontSize: s(17), fontWeight: '700' as const, textAlign: 'center' as const },
      // Speak
      speakCard: { width: '90%' as any, maxWidth: sw(500), alignItems: 'center' as const },
      speakEn: { fontSize: s(34), fontWeight: '900' as const, color: '#FFF', marginBottom: sh(4) },
      speakUz: { fontSize: s(16), color: 'rgba(255,255,255,0.5)', marginBottom: sh(12) },
      micArea: { alignItems: 'center' as const, marginTop: sh(12) },
      mic: { width: sm(80), height: sm(80), borderRadius: sm(40), backgroundColor: '#2471A3', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 3, borderColor: '#1B4F72', shadowColor: '#2471A3', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
      micRec: { backgroundColor: '#E74C3C', borderColor: '#C0392B', shadowColor: '#E74C3C' },
      micTxt: { marginTop: sh(8), color: 'rgba(255,255,255,0.7)', fontSize: s(13), fontWeight: '600' as const },
      recTxt: { marginTop: sh(4), color: 'rgba(255,255,255,0.35)', fontSize: s(12), fontStyle: 'italic' as const },
      // Dictation
      dictCard: { width: '90%' as any, maxWidth: sw(500), alignItems: 'center' as const },
      bigListen: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: s(20), padding: s(18), alignItems: 'center' as const, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', marginBottom: sh(12) },
      hint: { color: '#FFD700', fontSize: s(15), fontWeight: '600' as const, marginBottom: sh(8) },
      input: { width: '100%' as any, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: s(14), paddingHorizontal: sw(16), paddingVertical: sh(12), fontSize: s(20), color: '#FFF', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', textAlign: 'center' as const, fontWeight: '700' as const },
      checkBtn: { marginTop: sh(10), backgroundColor: '#2ECC71', borderRadius: s(14), paddingHorizontal: sw(28), paddingVertical: sh(12) },
      checkTxt: { color: '#FFF', fontSize: s(16), fontWeight: '800' as const },
      // Recall
      recallCard: { width: '90%' as any, maxWidth: sw(500), alignItems: 'center' as const },
      recallLabel: { fontSize: s(13), color: 'rgba(255,255,255,0.4)', fontWeight: '600' as const },
      recallUz: { fontSize: s(30), fontWeight: '900' as const, color: '#FFD700', marginVertical: sh(8), textShadowColor: 'rgba(255,215,0,0.3)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
      recallHint: { fontSize: s(13), color: 'rgba(255,255,255,0.4)', marginBottom: sh(6) },
      revealBox: { marginTop: sh(8), marginBottom: sh(8), paddingHorizontal: sw(20), paddingVertical: sh(14), borderRadius: s(18), backgroundColor: 'rgba(231,76,60,0.12)', borderWidth: 1.5, borderColor: 'rgba(231,76,60,0.35)', alignItems: 'center' as const },
      revealLabel: { fontSize: s(12), color: 'rgba(255,255,255,0.6)', fontWeight: '700' as const, letterSpacing: 1, marginBottom: sh(4) },
      revealWord: { fontSize: s(32), fontWeight: '900' as const, color: '#FFF', textShadowColor: 'rgba(255,215,0,0.4)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
      revealHint: { fontSize: s(11), color: 'rgba(255,255,255,0.45)', marginTop: sh(6), fontStyle: 'italic' as const },
      // Skip
      skipBtn: { paddingHorizontal: sw(20), paddingVertical: sh(10), alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'hidden' as const, ...shadowFx.soft },
      skipTxt: { color: '#FFF', fontSize: s(15), fontWeight: '800' as const, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
      webSkipLesson: { width: sm(40), height: sm(40), borderRadius: sm(20), alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'hidden' as const, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', ...shadowFx.soft },
      webSkipTxt: { color: '#FFF', fontSize: s(9), fontWeight: '900' as const, textAlign: 'center' as const },
      listenBigIcon: { fontSize: s(50) },
      micIcon: { fontSize: s(40) },
      listenSmIcon: { fontSize: s(28) },
      speakListenIcon: { fontSize: s(32) },
    });
  }, [SW, SH]);

  // === RENDER ===
  if (loading) return <View style={[ds.ctr,{justifyContent:'center'}]}><Text style={ds.loadTxt}>{t('loading')}</Text></View>;

  const progress = phase==='victory' ? 100 : (PHASE_ORDER.indexOf(phase)/PHASE_ORDER.length)*100 + ((idx/(phase==='match'?matchQueue.length:phase==='recall'?recallQueue.length:words.length))/PHASE_ORDER.length)*100;

  const currentWord = phase==='match' ? matchQueue[idx] : phase==='recall' ? recallQueue[idx] : words[idx];

  const renderFeedback = () => (
    <Animated.View style={[ds.fbBox, {opacity:feedbackOp}]}>
      {feedback==='success' ? <Text style={ds.fbOk}>{t('correct')} ⭐</Text> : feedback==='fail' ? <Text style={ds.fbFail}>{t('tryAgain')}</Text> : null}
    </Animated.View>
  );

  const renderMic = (ctx:string) => (
    <View style={ds.micArea}>
      <TouchableOpacity onPressIn={()=>startRec(ctx)} onPressOut={stopRec} activeOpacity={0.9}>
        <Animated.View style={[ds.mic, isRecording&&ds.micRec, {transform:[{scale:micScale}]}]}>
          <Text style={{fontSize:40}}>🎙️</Text>
        </Animated.View>
      </TouchableOpacity>
      <Text style={ds.micTxt}>{isChecking?t('checking'):isRecording?t('listening'):t('holdToSpeak')}</Text>
      {recognizedText?<Text style={ds.recTxt}>"{recognizedText}"</Text>:null}
    </View>
  );

  if (phase==='victory') {
    return (
      <View style={[ds.ctr,{backgroundColor:'#0A0A2E'}]}>
        <LinearGradient colors={['#0A0A2E','#1A1A4E','#2D1B69']} style={StyleSheet.absoluteFill}/>
        <VictoryOverlay
          visible
          title={t('amazing')}
          subtitle={`${level.toUpperCase()} • ${t('lesson')} ${lessonNum} ${t('completed')}`}
          icon="🏆"
        />
      </View>
    );
  }

  const isA1 = level==='a1'||level==='A1';
  const bgColors: [string, string, string] = isA1
    ? ['#0E2B5F', '#2F80ED', '#6CB8FF']
    : ['#1A0842', '#4B1082', '#A55BD1'];

  return (
    <View style={ds.ctr}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}/>

      {/* Header */}
      <View style={ds.hdr}>
        <TouchableOpacity style={ds.backBtn} onPress={()=>router.replace('/dashboard')} activeOpacity={0.85}>
          <Text style={ds.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={ds.hdrBlock}>
          <Text style={ds.hdrTitle}>{PHASE_NAMES[phase]}</Text>
          <Text style={ds.hdrSub}>{level.toUpperCase()} • Dars {lessonNum}</Text>
        </View>
        {Platform.OS === 'web' ? (
          <TouchableOpacity
            style={ds.webSkipLesson}
            onPress={() => handleVictory()}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#FF6B6B', '#E03E3E']} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />
            <Text style={ds.webSkipTxt}>⏭ Tugatish</Text>
          </TouchableOpacity>
        ) : (
          <View style={ds.hdrSpacer}/>
        )}
      </View>
      <View style={ds.progWrap}>
        <View style={[ds.progBar,{width:`${Math.min(progress,100)}%`}]}>
          <LinearGradient colors={[palette.gold, palette.coral]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill}/>
        </View>
      </View>

      {renderFeedback()}

      <Animated.View style={[ds.body, {transform:[{scale},{translateX:shakeX}]}]}>
       <ScrollView
         contentContainerStyle={ds.bodyScroll}
         showsVerticalScrollIndicator={false}
         bounces={false}
         keyboardShouldPersistTaps="handled"
       >
        {/* LEARN */}
        {phase==='learn' && currentWord && (
          <View style={ds.learnCard}>
            <Text style={ds.learnEn}>{currentWord.en}</Text>
            <View style={ds.divider}/>
            <Text style={ds.learnUz}>{currentWord.uz}</Text>
            <View style={ds.learnBtns}>
              <TouchableOpacity style={ds.listenBtn} onPress={()=>speakWord(currentWord.en)}>
                <Text style={{fontSize:28}}>🔊</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ds.nextBtn} onPress={learnNext}>
                <Text style={ds.nextTxt}>{t('nextWord')} →</Text>
              </TouchableOpacity>
            </View>
            <Text style={ds.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* MATCH */}
        {phase==='match' && currentWord && (
          <View style={ds.matchCard}>
            <Text style={ds.matchQ}>🇺🇿 {currentWord.uz}</Text>
            <Text style={ds.matchHint}>{t('chooseCorrect')}</Text>
            <View style={ds.optGrid}>
              {matchOptions.map((opt,i)=>(
                <TouchableOpacity key={i} style={ds.optBtn} onPress={()=>handleMatchSelect(opt)} activeOpacity={0.7}>
                  <LinearGradient colors={['rgba(255,255,255,0.12)','rgba(255,255,255,0.05)']} style={[StyleSheet.absoluteFill,{borderRadius:16}]}/>
                  <Text style={ds.optTxt}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={ds.counter}>{idx+1} / {matchQueue.length}</Text>
          </View>
        )}

        {/* SPEAK */}
        {phase==='speak' && currentWord && (
          <View style={ds.speakCard}>
            <Text style={ds.speakEn}>{currentWord.en}</Text>
            <Text style={ds.speakUz}>{currentWord.uz}</Text>
            <TouchableOpacity style={ds.listenBtn} onPress={()=>speakWord(currentWord.en)}>
              <Text style={{fontSize:32}}>🔊</Text>
            </TouchableOpacity>
            {renderMic(currentWord.en)}
            <Text style={ds.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* DICTATION */}
        {phase==='dictation' && currentWord && (
          <View style={ds.dictCard}>
            <TouchableOpacity style={ds.bigListen} onPress={()=>speakWord(currentWord.en)}>
              <Text style={{fontSize:50}}>🔊</Text>
              <Text style={ds.listenTxt}>{t('listenAndWrite')}</Text>
            </TouchableOpacity>
            {showHint && <Text style={ds.hint}>💡 Boshlanishi: {currentWord.en.slice(0,2)}...</Text>}
            <TextInput style={ds.input} value={dictInput} onChangeText={setDictInput}
              placeholder={t('writeWord')} placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none" autoCorrect={false} onSubmitEditing={checkDict}/>
            <TouchableOpacity style={ds.checkBtn} onPress={checkDict}>
              <Text style={ds.checkTxt}>{t('checkBtn')} ✓</Text>
            </TouchableOpacity>
            <Text style={ds.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* RECALL */}
        {phase==='recall' && currentWord && (
          <View style={ds.recallCard}>
            <LinearGradient colors={['rgba(255,255,255,0.08)','rgba(255,255,255,0.02)']} style={[StyleSheet.absoluteFill,{borderRadius:radius.xl}]} />
            <Text style={ds.recallLabel}>🇺🇿 Tarjima:</Text>
            <Text style={ds.recallUz}>{currentWord.uz}</Text>
            {revealAnswer ? (
              <View style={ds.revealBox}>
                <Text style={ds.revealLabel}>{t('correctAnswer')}</Text>
                <Text style={ds.revealWord}>{revealAnswer}</Text>
                <Text style={ds.revealHint}>{t('rememberIt')}</Text>
              </View>
            ) : (
              <>
                <Text style={ds.recallHint}>{t('sayInEnglish')}{(recallFails[normalize(currentWord.en)]||0) > 0 ? `  •  ${Math.max(0, 3 - (recallFails[normalize(currentWord.en)]||0))} ${t('attemptsLeft')}` : ''}</Text>
                {renderMic(currentWord.en)}
              </>
            )}
            <Text style={ds.counter}>{idx+1} / {recallQueue.length}</Text>
          </View>
        )}

        {/* WEB SKIP BUTTON */}
        {Platform.OS === 'web' && phase !== 'learn' && currentWord && (
          <TouchableOpacity
            style={[ds.skipBtn, { marginTop: 24 }]}
            onPress={() => {
              if (phase === 'match') handleMatchSelect(currentWord.en);
              else if (phase === 'speak') checkSpeak(currentWord.en, currentWord.en);
              else if (phase === 'dictation') {
                showFB('success'); playSound('success');
                setTimeout(() => {
                  setDictInput(''); setDictFails(0); setShowHint(false);
                  const ni=idxRef.current+1;
                  if (ni<wordsRef.current.length) {
                    idxRef.current=ni; setIdx(ni); animIn();
                    setTimeout(()=>speakWord(wordsRef.current[ni].en),400);
                  } else nextPhase();
                }, 800);
              }
              else if (phase === 'recall') checkRecall(currentWord.en, currentWord.en);
            }}
          >
            <LinearGradient colors={[palette.mint, palette.mintDeep]} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <Text style={ds.skipTxt}>✅ {t('correct')}</Text>
          </TouchableOpacity>
        )}
       </ScrollView>
      </Animated.View>
    </View>
  );
}


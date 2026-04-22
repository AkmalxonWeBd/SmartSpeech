import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, useWindowDimensions, Keyboard } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { API } from '../utils/api';
import { playSound } from '../utils/soundProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VictoryOverlay from '../components/VictoryOverlay';
import { palette, radius, shadowFx, spacing } from '../utils/theme';

type Word = { en: string; uz: string };
type Phase = 'learn' | 'match' | 'speak' | 'dictation' | 'recall' | 'victory';
const PHASE_NAMES: Record<Phase, string> = { learn:'📖 O\'rganish', match:'🧩 Yodlash', speak:'🎙️ Talaffuz', dictation:'✍️ Diktant', recall:'🧠 Xotira', victory:'' };
const PHASE_ORDER: Phase[] = ['learn','match','speak','dictation','recall'];

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

export default function WordLessonScreen() {
  const params = useLocalSearchParams();
  const level = (params.level as string) || 'A1';
  const lessonNum = parseInt(params.lesson as string) || 1;
  useWindowDimensions();

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

  const normalize = (t:string) => t.toLowerCase().trim().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ');
  const similarity = (a:string, b:string): number => {
    const na=normalize(a), nb=normalize(b);
    if(na===nb) return 1;
    // For short strings, check inclusion
    if(na.length<2||nb.length<2) {
      if(na.includes(nb)||nb.includes(na)) return 0.8;
      return 0;
    }
    const bg = (s:string) => { const m=new Map<string,number>(); for(let i=0;i<s.length-1;i++){const bi=s.substring(i,i+2);m.set(bi,(m.get(bi)||0)+1);} return m; };
    const b1=bg(na), b2=bg(nb); let mt=0;
    b1.forEach((c,bi) => { mt += Math.min(c, b2.get(bi)||0); });
    return (2*mt)/(na.length-1+nb.length-1);
  };

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

  // Pick the alternative that best matches `expected`.
  const pickBestMatch = (candidates: string[], expected: string): string => {
    if (candidates.length === 0) return '';
    const ne = normalize(expected);
    let best = candidates[0];
    let bestScore = -1;
    for (const c of candidates) {
      const nc = normalize(c);
      const score = nc.includes(ne) || ne.includes(nc) ? 1 : similarity(c, expected);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  };

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
          const chosen = pickBestMatch(allTranscripts, w.en);
          checkSpeak(chosen || t, w.en);
        }
      } else if (p === 'recall') {
        const w = recallQueueRef.current[idxRef.current];
        // Strip "english" filler word — user says "english sea" but means "sea"
        const stripFiller = (s: string) => s.replace(/\benglish\b/gi, '').replace(/\s+/g, ' ').trim();
        if (w) {
          const cleanedAlts = allTranscripts.map(stripFiller).filter(Boolean);
          const chosen = pickBestMatch(cleanedAlts, w.en);
          checkRecall(chosen || stripFiller(t) || t, w.en);
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
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      maxAlternatives: 5,
      contextualStrings: [contextWord, ...allContext],
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

  // === RENDER ===
  if (loading) return <View style={[st.ctr,{justifyContent:'center'}]}><Text style={st.loadTxt}>Yuklanmoqda...</Text></View>;

  const progress = phase==='victory' ? 100 : (PHASE_ORDER.indexOf(phase)/PHASE_ORDER.length)*100 + ((idx/(phase==='match'?matchQueue.length:phase==='recall'?recallQueue.length:words.length))/PHASE_ORDER.length)*100;

  const currentWord = phase==='match' ? matchQueue[idx] : phase==='recall' ? recallQueue[idx] : words[idx];

  const renderFeedback = () => (
    <Animated.View style={[st.fbBox, {opacity:feedbackOp}]}>
      {feedback==='success' ? <Text style={st.fbOk}>To'g'ri! ⭐</Text> : feedback==='fail' ? <Text style={st.fbFail}>Qayta urinib ko'ring</Text> : null}
    </Animated.View>
  );

  const renderMic = (ctx:string) => (
    <View style={st.micArea}>
      <TouchableOpacity onPressIn={()=>startRec(ctx)} onPressOut={stopRec} activeOpacity={0.9}>
        <Animated.View style={[st.mic, isRecording&&st.micRec, {transform:[{scale:micScale}]}]}>
          <Text style={{fontSize:40}}>🎙️</Text>
        </Animated.View>
      </TouchableOpacity>
      <Text style={st.micTxt}>{isChecking?"Tekshirilmoqda...":isRecording?"Eshitilmoqda...":"Bosib turib ayting"}</Text>
      {recognizedText?<Text style={st.recTxt}>"{recognizedText}"</Text>:null}
    </View>
  );

  if (phase==='victory') {
    return (
      <View style={[st.ctr,{backgroundColor:'#0A0A2E'}]}>
        <LinearGradient colors={['#0A0A2E','#1A1A4E','#2D1B69']} style={StyleSheet.absoluteFill}/>
        <VictoryOverlay
          visible
          title="AJOYIB!"
          subtitle={`${level.toUpperCase()} • Dars ${lessonNum} tugatildi`}
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
    <View style={st.ctr}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}}/>

      {/* Header */}
      <View style={st.hdr}>
        <TouchableOpacity style={st.backBtn} onPress={()=>router.replace('/dashboard')} activeOpacity={0.85}>
          <Text style={st.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={st.hdrBlock}>
          <Text style={st.hdrTitle}>{PHASE_NAMES[phase]}</Text>
          <Text style={st.hdrSub}>{level.toUpperCase()} • Dars {lessonNum}</Text>
        </View>
        <View style={st.hdrSpacer}/>
      </View>
      <View style={st.progWrap}>
        <View style={[st.progBar,{width:`${Math.min(progress,100)}%`}]}>
          <LinearGradient colors={[palette.gold, palette.coral]} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill}/>
        </View>
      </View>

      {renderFeedback()}

      <Animated.View style={[st.body, {transform:[{scale},{translateX:shakeX}]}]}>
        {/* LEARN */}
        {phase==='learn' && currentWord && (
          <View style={st.learnCard}>
            <Text style={st.learnEn}>{currentWord.en}</Text>
            <View style={st.divider}/>
            <Text style={st.learnUz}>{currentWord.uz}</Text>
            <View style={st.learnBtns}>
              <TouchableOpacity style={st.listenBtn} onPress={()=>speakWord(currentWord.en)}>
                <Text style={{fontSize:28}}>🔊</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.nextBtn} onPress={learnNext}>
                <Text style={st.nextTxt}>Keyingi →</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* MATCH */}
        {phase==='match' && currentWord && (
          <View style={st.matchCard}>
            <Text style={st.matchQ}>🇺🇿 {currentWord.uz}</Text>
            <Text style={st.matchHint}>To'g'ri inglizcha so'zni tanlang</Text>
            <View style={st.optGrid}>
              {matchOptions.map((opt,i)=>(
                <TouchableOpacity key={i} style={st.optBtn} onPress={()=>handleMatchSelect(opt)} activeOpacity={0.7}>
                  <LinearGradient colors={['rgba(255,255,255,0.12)','rgba(255,255,255,0.05)']} style={[StyleSheet.absoluteFill,{borderRadius:16}]}/>
                  <Text style={st.optTxt}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.counter}>{idx+1} / {matchQueue.length}</Text>
          </View>
        )}

        {/* SPEAK */}
        {phase==='speak' && currentWord && (
          <View style={st.speakCard}>
            <Text style={st.speakEn}>{currentWord.en}</Text>
            <Text style={st.speakUz}>{currentWord.uz}</Text>
            <TouchableOpacity style={st.listenBtn} onPress={()=>speakWord(currentWord.en)}>
              <Text style={{fontSize:32}}>🔊</Text><Text style={st.listenTxt}>Eshitish</Text>
            </TouchableOpacity>
            {renderMic(currentWord.en)}
            <Text style={st.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* DICTATION */}
        {phase==='dictation' && currentWord && (
          <View style={st.dictCard}>
            <TouchableOpacity style={st.bigListen} onPress={()=>speakWord(currentWord.en)}>
              <Text style={{fontSize:50}}>🔊</Text>
              <Text style={st.listenTxt}>Eshitib yozing</Text>
            </TouchableOpacity>
            {showHint && <Text style={st.hint}>💡 Boshlanishi: {currentWord.en.slice(0,2)}...</Text>}
            <TextInput style={st.input} value={dictInput} onChangeText={setDictInput}
              placeholder="So'zni yozing..." placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none" autoCorrect={false} onSubmitEditing={checkDict}/>
            <TouchableOpacity style={st.checkBtn} onPress={checkDict}>
              <Text style={st.checkTxt}>Tekshirish ✓</Text>
            </TouchableOpacity>
            <Text style={st.counter}>{idx+1} / {words.length}</Text>
          </View>
        )}

        {/* RECALL */}
        {phase==='recall' && currentWord && (
          <View style={st.recallCard}>
            <LinearGradient colors={['rgba(255,255,255,0.08)','rgba(255,255,255,0.02)']} style={[StyleSheet.absoluteFill,{borderRadius:radius.xl}]} />
            <Text style={st.recallLabel}>🇺🇿 Tarjima:</Text>
            <Text style={st.recallUz}>{currentWord.uz}</Text>
            {revealAnswer ? (
              <View style={st.revealBox}>
                <Text style={st.revealLabel}>To'g'ri javob:</Text>
                <Text style={st.revealWord}>{revealAnswer}</Text>
                <Text style={st.revealHint}>Esda saqlang — keyinroq yana keladi</Text>
              </View>
            ) : (
              <>
                <Text style={st.recallHint}>Inglizchada ayting{(recallFails[normalize(currentWord.en)]||0) > 0 ? `  •  ${3 - (recallFails[normalize(currentWord.en)]||0)} urinish qoldi` : ''}</Text>
                {renderMic(currentWord.en)}
              </>
            )}
            <Text style={st.counter}>{idx+1} / {recallQueue.length}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  ctr:{flex:1},
  loadTxt:{color:'#fff',fontSize:18,textAlign:'center',fontWeight:'700'},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:spacing.lg,paddingTop:spacing.md,gap:spacing.md},
  backBtn:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,0.25)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.45)',alignItems:'center',justifyContent:'center',...shadowFx.soft},
  backIcon:{color:'#FFF',fontSize:24,fontWeight:'900',marginTop:-2},
  hdrBlock:{flex:1,alignItems:'center'},
  hdrSpacer:{width:44},
  hdrTitle:{fontSize:20,fontWeight:'900',color:palette.gold,letterSpacing:1,textShadowColor:'rgba(0,0,0,0.35)',textShadowOffset:{width:0,height:1},textShadowRadius:4},
  hdrSub:{fontSize:13,fontWeight:'700',color:'rgba(255,255,255,0.85)',marginTop:2,letterSpacing:1},
  progWrap:{height:10,backgroundColor:'rgba(0,0,0,0.18)',marginHorizontal:spacing.lg,marginTop:10,borderRadius:5,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
  progBar:{height:'100%',borderRadius:5,overflow:'hidden'},
  fbBox:{position:'absolute',top:'14%',alignSelf:'center',zIndex:99,paddingHorizontal:spacing.xl,paddingVertical:10,borderRadius:radius.pill,backgroundColor:'rgba(0,0,0,0.75)',borderWidth:1,borderColor:'rgba(255,255,255,0.3)',...shadowFx.lifted},
  fbOk:{color:'#2ECC71',fontSize:20,fontWeight:'bold'},
  fbFail:{color:'#E74C3C',fontSize:18,fontWeight:'bold'},
  body:{flex:1,justifyContent:'center',alignItems:'center',padding:16},
  // Learn
  learnCard:{width:'90%',backgroundColor:'rgba(255,255,255,0.08)',borderRadius:24,padding:30,alignItems:'center',borderWidth:2,borderColor:'rgba(255,215,0,0.3)'},
  learnEn:{fontSize:48,fontWeight:'900',color:'#FFF',textShadowColor:'rgba(255,215,0,0.4)',textShadowRadius:10,textShadowOffset:{width:0,height:2}},
  divider:{width:'60%',height:2,backgroundColor:'rgba(255,255,255,0.15)',marginVertical:16},
  learnUz:{fontSize:22,color:'rgba(255,255,255,0.7)',fontWeight:'600'},
  learnBtns:{flexDirection:'row',marginTop:24,gap:16},
  listenBtn:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:20,paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
  listenTxt:{color:'rgba(255,255,255,0.8)',fontSize:14,fontWeight:'600'},
  nextBtn:{backgroundColor:'#FFD700',borderRadius:20,paddingHorizontal:28,paddingVertical:14},
  nextTxt:{color:'#1a1a1a',fontSize:16,fontWeight:'800'},
  counter:{marginTop:16,color:'rgba(255,255,255,0.35)',fontSize:13},
  // Match
  matchCard:{width:'90%',alignItems:'center'},
  matchQ:{fontSize:32,fontWeight:'900',color:'#FFF',marginBottom:8},
  matchHint:{fontSize:14,color:'rgba(255,255,255,0.4)',marginBottom:20},
  optGrid:{width:'100%',gap:12},
  optBtn:{paddingVertical:16,paddingHorizontal:20,borderRadius:16,borderWidth:1.5,borderColor:'rgba(255,255,255,0.2)',overflow:'hidden'},
  optTxt:{color:'#FFF',fontSize:20,fontWeight:'700',textAlign:'center'},
  // Speak
  speakCard:{width:'90%',alignItems:'center'},
  speakEn:{fontSize:40,fontWeight:'900',color:'#FFF',marginBottom:4},
  speakUz:{fontSize:18,color:'rgba(255,255,255,0.5)',marginBottom:16},
  micArea:{alignItems:'center',marginTop:16},
  mic:{width:90,height:90,borderRadius:45,backgroundColor:'#2471A3',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#1B4F72',shadowColor:'#2471A3',shadowOffset:{width:0,height:0},shadowOpacity:0.6,shadowRadius:12,elevation:8},
  micRec:{backgroundColor:'#E74C3C',borderColor:'#C0392B',shadowColor:'#E74C3C'},
  micTxt:{marginTop:10,color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:'600'},
  recTxt:{marginTop:6,color:'rgba(255,255,255,0.35)',fontSize:12,fontStyle:'italic'},
  // Dictation
  dictCard:{width:'90%',alignItems:'center'},
  bigListen:{backgroundColor:'rgba(255,255,255,0.08)',borderRadius:24,padding:24,alignItems:'center',borderWidth:2,borderColor:'rgba(255,255,255,0.15)',marginBottom:16},
  hint:{color:'#FFD700',fontSize:16,fontWeight:'600',marginBottom:10},
  input:{width:'100%',backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,paddingHorizontal:20,paddingVertical:14,fontSize:22,color:'#FFF',borderWidth:1.5,borderColor:'rgba(255,255,255,0.2)',textAlign:'center',fontWeight:'700'},
  checkBtn:{marginTop:14,backgroundColor:'#2ECC71',borderRadius:16,paddingHorizontal:32,paddingVertical:14},
  checkTxt:{color:'#FFF',fontSize:18,fontWeight:'800'},
  // Recall
  recallCard:{width:'90%',alignItems:'center'},
  recallLabel:{fontSize:14,color:'rgba(255,255,255,0.4)',fontWeight:'600'},
  recallUz:{fontSize:36,fontWeight:'900',color:'#FFD700',marginVertical:12,textShadowColor:'rgba(255,215,0,0.3)',textShadowRadius:10,textShadowOffset:{width:0,height:2}},
  recallHint:{fontSize:14,color:'rgba(255,255,255,0.4)',marginBottom:8},
  revealBox:{marginTop:12,marginBottom:12,paddingHorizontal:24,paddingVertical:18,borderRadius:20,backgroundColor:'rgba(231,76,60,0.12)',borderWidth:1.5,borderColor:'rgba(231,76,60,0.35)',alignItems:'center'},
  revealLabel:{fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:'700',letterSpacing:1,marginBottom:6},
  revealWord:{fontSize:38,fontWeight:'900',color:'#FFF',textShadowColor:'rgba(255,215,0,0.4)',textShadowRadius:12,textShadowOffset:{width:0,height:2}},
  revealHint:{fontSize:12,color:'rgba(255,255,255,0.45)',marginTop:8,fontStyle:'italic'},
  // Victory

});

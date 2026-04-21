import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getCachedUri } from '../utils/assetManager';
import { API } from '../utils/api';

const VIDEO_FILE = 'harflar.mp4';

export default function IntroVideoScreen() {
  const { nextRoute, canSkip } = useLocalSearchParams();
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Lokal keshda bo'lsa — shundan, bo'lmasa to'g'ridan-to'g'ri serverdan stream.
  // Shu tarzda splash'da yuklash tugamagan bo'lsa ham qora ekran bo'lmaydi.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localUri = getCachedUri('videos', VIDEO_FILE);
        const info = await FileSystem.getInfoAsync(localUri);
        if (cancelled) return;
        setVideoUri(info.exists ? localUri : API.getAssetUrl('videos', VIDEO_FILE));
      } catch (e) {
        console.warn('Intro video resolve failed, falling back to remote', e);
        if (!cancelled) setVideoUri(API.getAssetUrl('videos', VIDEO_FILE));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener('playToEnd', () => {
      handleFinish();
    });
    return () => subscription.remove();
  }, [player]);

  const handleFinish = () => {
    if (nextRoute) {
      router.replace(nextRoute as any);
    } else {
      router.back();
    }
  };

  const skipVideo = () => {
    try { player?.pause(); } catch {}
    handleFinish();
  };

  if (!videoUri) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Video tayyorlanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />

      {canSkip === 'true' && (
        <TouchableOpacity style={styles.skipButton} onPress={skipVideo}>
          <Text style={styles.skipText}>O&apos;tkazib yuborish ⏭</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  video: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 40,
    right: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: {
    color: '#fff',
    fontWeight: '700',
  },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayerStatus } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { getCachedUri } from '../utils/assetManager';
import { API } from '../utils/api';

const VIDEO_FILE = 'harflar.mp4';

export default function IntroVideoScreen() {
  const { nextRoute, canSkip } = useLocalSearchParams();
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Lokal keshda bo'lsa — shundan, bo'lmasa to'g'ridan-to'g'ri serverdan stream.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remoteUri = API.getAssetUrl('videos', VIDEO_FILE);
      try {
        const localUri = getCachedUri('videos', VIDEO_FILE);
        const info = await FileSystem.getInfoAsync(localUri);
        if (cancelled) return;
        const resolved = info.exists ? localUri : remoteUri;
        console.log('[IntroVideo] using', resolved);
        setVideoUri(resolved);
      } catch (e) {
        console.warn('[IntroVideo] resolve failed, falling back to remote', e);
        if (!cancelled) setVideoUri(remoteUri);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFinish = () => {
    if (nextRoute) router.replace(nextRoute as any);
    else router.back();
  };

  if (!videoUri) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Video tayyorlanmoqda...</Text>
      </View>
    );
  }

  // URI hozir aniq mavjud — shu sababli VideoPlayer ni alohida child komponentda,
  // hech qachon null bilan yaratmaslikka harakat qilamiz.
  return (
    <IntroVideoPlayer
      uri={videoUri}
      canSkip={canSkip === 'true'}
      onFinish={handleFinish}
    />
  );
}

function IntroVideoPlayer({
  uri,
  canSkip,
  onFinish,
}: {
  uri: string;
  canSkip: boolean;
  onFinish: () => void;
}) {
  const [errored, setErrored] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    try {
      p.play();
    } catch (e) {
      console.warn('[IntroVideo] play() threw', e);
    }
  });

  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => onFinish());
    const statusSub = player.addListener(
      'statusChange',
      ({ status, error }: { status: VideoPlayerStatus; error?: unknown }) => {
        console.log('[IntroVideo] status:', status, error ?? '');
        if (status === 'error') setErrored(true);
      },
    );
    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [player, onFinish]);

  if (errored) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Video yuklanmadi</Text>
        <TouchableOpacity style={styles.skipButton} onPress={onFinish}>
          <Text style={styles.skipText}>Davom etish ▶</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />

      {canSkip && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            try { player.pause(); } catch {}
            onFinish();
          }}
        >
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
  center: {
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
    width: '100%',
    height: '100%',
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

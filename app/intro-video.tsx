import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useVideoPlayer, VideoView, VideoPlayerStatus } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { getAssetModule } from '../utils/assetManager';

const VIDEO_FILE = 'harflar.mp4';

export default function IntroVideoScreen() {
  const { nextRoute, canSkip } = useLocalSearchParams();
  const [errored, setErrored] = useState(false);

  // Offline rejim — `require(...)` orqali bundle qilingan asset ID.
  const videoSource = getAssetModule('videos', VIDEO_FILE) ?? null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = false;
    try {
      p.play();
    } catch (e) {
      console.warn('[IntroVideo] play() threw', e);
    }
  });

  const handleFinish = () => {
    if (nextRoute) router.replace(nextRoute as any);
    else router.back();
  };

  useEffect(() => {
    const endSub = player.addListener('playToEnd', handleFinish);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  if (errored || videoSource == null) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Video topilmadi</Text>
        <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
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

      {canSkip === 'true' && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            try { player.pause(); } catch {}
            handleFinish();
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

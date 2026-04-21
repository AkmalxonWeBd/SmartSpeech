import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { getCachedUri } from '../utils/assetManager';

export default function IntroVideoScreen() {
  const { nextRoute, canSkip } = useLocalSearchParams();
  const videoUri = getCachedUri('videos', 'harflar.mp4');
  
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
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
    player.pause();
    handleFinish();
  };

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
          <Text style={styles.skipText}>O'tkazib yuborish ⏭</Text>
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

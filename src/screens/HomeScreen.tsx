import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Video from 'react-native-video';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => router.replace('/(tabs)/home')}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill} />

      {/* Logo */}
      <Image
        source={require('../../assets/idleFantasyRPGLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Tap to continue animation (transparent webm) */}
      <View style={styles.tapContainer}>
        <Video
          source={require('../../assets/tap_animation.webm')}
          style={styles.tapVideo}
          repeat
          muted
          resizeMode="contain"
          paused={false}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.8,
    height: height * 0.35,
    marginBottom: 40,
  },
  tapContainer: {
    position: 'absolute',
    bottom: height * 0.12,
    width: width * 0.7,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

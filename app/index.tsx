import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isLoading } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isLoading, fadeOut]);

  // Splash screen with fade — routing is handled by _layout.tsx
  if (showSplash) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.splashContent, { opacity: fadeOut }]}>
          <Text style={styles.title}>SCRIM</Text>
          <Text style={styles.subtitle}>Find your next practice match.</Text>
        </Animated.View>
      </View>
    );
  }

  // Empty view — _layout.tsx will redirect based on auth state
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ECE8E1',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#768A96',
    marginTop: 12,
  },
});

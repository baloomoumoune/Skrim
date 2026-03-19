import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';

interface LoadingScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export default function LoadingScreen({
  onFinish,
  minDuration = 1200,
}: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in the logo
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse loop: scale 0.6 → 1 → 0.6
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Call onFinish after minDuration
    if (onFinish) {
      const timer = setTimeout(onFinish, minDuration);
      return () => {
        clearTimeout(timer);
        pulse.stop();
      };
    }

    return () => {
      pulse.stop();
    };
  }, [fadeIn, pulseAnim, onFinish, minDuration]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeIn,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Image
          source={require('@/assets/images/skrim-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  logoWrapper: {
    width: 120,
    height: 120,
  },
  logo: {
    width: 120,
    height: 120,
  },
});

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import OtpInput from '@/components/auth/OtpInput';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = useCallback(
    async (code: string) => {
      if (!email) return;
      setLoading(true);
      setError(false);

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });

        if (verifyError) {
          setError(true);
          if (__DEV__) console.error('[VerifyEmail] Error:', verifyError.message);
        } else {
          setSuccess(true);
          // Session is now active — useProtectedRoute will redirect to onboarding
        }
      } catch {
        setError(true);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleResend = async () => {
    if (!email || resendTimer > 0) return;
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        Alert.alert('Error', resendError.message);
      } else {
        setResendTimer(RESEND_COOLDOWN);
        Alert.alert('Sent', 'A new verification code has been sent to your email.');
      }
    } catch {
      Alert.alert('Error', 'Failed to resend code.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Back button */}
        <MotiView
          from={{ opacity: 0, translateX: -10 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </MotiView>

        {/* Icon + Title */}
        <View style={styles.heroSection}>
          <MotiView
            from={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 200 }}
            style={[
              styles.iconCircle,
              {
                backgroundColor: success
                  ? 'rgba(34,197,94,0.12)'
                  : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
              },
            ]}
          >
            <Ionicons
              name={success ? 'checkmark-circle' : 'mail-outline'}
              size={40}
              color={success ? '#22C55E' : c.accent}
            />
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 300 }}
          >
            <Text style={[styles.title, { color: c.textPrimary }]}>
              {success ? 'Email verified!' : 'Check your email'}
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {success
                ? 'Your account is ready. Redirecting...'
                : `We sent a verification code to\n${email}`}
            </Text>
          </MotiView>
        </View>

        {/* OTP Input */}
        {!success && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 500 }}
            style={styles.otpSection}
          >
            <OtpInput length={8} onComplete={handleVerify} error={error} />

            {error && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 200 }}
              >
                <Text style={styles.errorText}>Invalid code. Please try again.</Text>
              </MotiView>
            )}

            {loading && (
              <ActivityIndicator
                color={c.accent}
                size="small"
                style={styles.loadingIndicator}
              />
            )}
          </MotiView>
        )}

        {/* Bottom actions */}
        {!success && (
          <View style={styles.bottomSection}>
            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
              activeOpacity={0.7}
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendText,
                  { color: resendTimer > 0 ? c.textTertiary : c.accent },
                ]}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>

            {/* Use different email */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={styles.differentEmailButton}
            >
              <Text style={[styles.differentEmailText, { color: c.textTertiary }]}>
                Use a different email
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  otpSection: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: '#FF4655',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 12,
  },
  resendButton: {
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  differentEmailButton: {
    padding: 8,
  },
  differentEmailText: {
    fontSize: 14,
  },
});

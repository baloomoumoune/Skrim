import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import OtpInput from '@/components/auth/OtpInput';
import AuthInput from '@/components/auth/AuthInput';

type Step = 'otp' | 'password';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState<Step>('otp');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleOtpComplete = useCallback(
    async (code: string) => {
      if (!email) return;
      setLoading(true);
      setOtpError(false);

      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'recovery',
        });

        if (error) {
          setOtpError(true);
          if (__DEV__) console.error('[ResetPassword] OTP error:', error.message);
        } else {
          // Session is now set — user is authenticated
          setStep('password');
        }
      } catch {
        setOtpError(true);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleResetPassword = async () => {
    setPasswordErrors({});
    const errors: Record<string, string> = {};

    if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setSuccess(true);
        // User is already authenticated — useProtectedRoute will redirect to tabs
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

          {/* Title area */}
          <AnimatePresence exitBeforeEnter>
            {step === 'otp' && !success && (
              <MotiView
                key="otp-header"
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -8 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.headerSection}
              >
                <Text style={[styles.title, { color: c.textPrimary }]}>
                  Enter the code
                </Text>
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                  We sent a code to {email}
                </Text>
              </MotiView>
            )}

            {step === 'password' && !success && (
              <MotiView
                key="password-header"
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -8 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.headerSection}
              >
                <Text style={[styles.title, { color: c.textPrimary }]}>
                  New password
                </Text>
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                  Choose a strong password for your account
                </Text>
              </MotiView>
            )}

            {success && (
              <MotiView
                key="success-header"
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 14 }}
                style={styles.successSection}
              >
                <View
                  style={[
                    styles.successCircle,
                    { backgroundColor: 'rgba(34,197,94,0.12)' },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                </View>
                <Text style={[styles.title, { color: c.textPrimary, textAlign: 'center' }]}>
                  Password reset!
                </Text>
                <Text style={[styles.subtitle, { color: c.textSecondary, textAlign: 'center' }]}>
                  You're all set. Redirecting...
                </Text>
              </MotiView>
            )}
          </AnimatePresence>

          {/* OTP Step */}
          {step === 'otp' && !success && (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 200 }}
              style={styles.otpSection}
            >
              <OtpInput length={8} onComplete={handleOtpComplete} error={otpError} />

              {otpError && (
                <Text style={styles.errorText}>Invalid code. Please try again.</Text>
              )}

              {loading && (
                <ActivityIndicator color={c.accent} size="small" style={styles.loader} />
              )}
            </MotiView>
          )}

          {/* Password Step */}
          {step === 'password' && !success && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.passwordSection}
            >
              <AuthInput
                label="New password"
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  setPasswordErrors({});
                }}
                secure
                placeholder="Minimum 8 characters"
                error={passwordErrors.newPassword}
                autoFocus
              />
              <View style={styles.gap16} />
              <AuthInput
                label="Confirm password"
                icon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setPasswordErrors({});
                }}
                secure
                placeholder="Repeat your password"
                error={passwordErrors.confirmPassword}
              />
            </MotiView>
          )}

          {/* Spacer */}
          <View style={styles.flex} />

          {/* Action button for password step */}
          {step === 'password' && !success && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18 }}
              style={styles.bottomSection}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    opacity:
                      loading || !newPassword || !confirmPassword ? 0.5 : 1,
                  },
                ]}
                onPress={handleResetPassword}
                disabled={loading || !newPassword || !confirmPassword}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator
                    color={isDark ? '#000000' : '#FFFFFF'}
                    size="small"
                  />
                ) : (
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: isDark ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    Reset password
                  </Text>
                )}
              </TouchableOpacity>
            </MotiView>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  headerSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  successSection: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  loader: {
    marginTop: 8,
  },
  passwordSection: {
    marginTop: 0,
  },
  gap16: {
    height: 16,
  },
  bottomSection: {
    paddingBottom: 8,
  },
  actionButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import AuthInput from '@/components/auth/AuthInput';

type Mode = 'email' | 'login' | 'signup';

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const clearErrors = useCallback(() => setErrors({}), []);

  const handleNext = async () => {
    clearErrors();
    if (!isValidEmail) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as Function)('check_email_exists', {
        p_email: email,
      });
      if (error) {
        setErrors({ email: error.message });
        return;
      }
      setMode(data === true ? 'login' : 'signup');
    } catch {
      // Fallback to login mode if RPC fails
      setMode('login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    clearErrors();
    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ password: 'Invalid email or password' });
        } else if (error.message.includes('Email not confirmed')) {
          // Email exists but not verified — send to verification
          router.push({ pathname: '/(auth)/verify-email', params: { email } });
        } else {
          setErrors({ password: error.message });
        }
      }
      // On success, useProtectedRoute handles navigation
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    clearErrors();
    const newErrors: Record<string, string> = {};

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Try signing in.' });
          setMode('login');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        router.push({ pathname: '/(auth)/verify-email', params: { email } });
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    clearErrors();
    setPassword('');
    setConfirmPassword('');
    setMode(newMode);
  };

  const title =
    mode === 'email'
      ? 'Enter your email'
      : mode === 'login'
        ? 'Welcome back'
        : 'Create your account';

  const subtitle =
    mode === 'email'
      ? 'We\'ll check if you have an account'
      : mode === 'login'
        ? email
        : email;

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
          {/* Header with back button */}
          <MotiView
            from={{ opacity: 0, translateX: -10 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 250 }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (mode === 'email') {
                  router.back();
                } else {
                  switchMode('email');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
            </TouchableOpacity>
          </MotiView>

          {/* Title & subtitle */}
          <MotiView
            key={mode}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.headerSection}
          >
            <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
          </MotiView>

          {/* Form */}
          <ScrollView
            style={styles.formSection}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AnimatePresence exitBeforeEnter>
              {mode === 'email' && (
                <MotiView
                  key="email-step"
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -10 }}
                  transition={{ type: 'timing', duration: 250 }}
                >
                  <AuthInput
                    label="Email"
                    icon="mail-outline"
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearErrors(); }}
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    error={errors.email}
                    autoFocus
                  />
                </MotiView>
              )}

              {mode === 'login' && (
                <MotiView
                  key="login-step"
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -10 }}
                  transition={{ type: 'timing', duration: 250 }}
                  style={styles.formGap}
                >
                  <AuthInput
                    label="Password"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearErrors(); }}
                    secure
                    placeholder="Enter your password"
                    error={errors.password}
                    autoFocus
                  />

                  <TouchableOpacity
                    style={styles.forgotButton}
                    onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email } })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.linkText, { color: c.accent }]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </MotiView>
              )}

              {mode === 'signup' && (
                <MotiView
                  key="signup-step"
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -10 }}
                  transition={{ type: 'timing', duration: 250 }}
                  style={styles.formGap}
                >
                  <AuthInput
                    label="Password"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearErrors(); }}
                    secure
                    placeholder="Minimum 8 characters"
                    error={errors.password}
                    autoFocus
                  />
                  <AuthInput
                    label="Confirm password"
                    icon="lock-closed-outline"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); clearErrors(); }}
                    secure
                    placeholder="Repeat your password"
                    error={errors.confirmPassword}
                  />
                </MotiView>
              )}
            </AnimatePresence>
          </ScrollView>

          {/* Bottom: action button + mode switch */}
          <View style={styles.bottomSection}>
            {/* Primary action button */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, delay: 150 }}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isDark ? '#FFFFFF' : '#000000',
                    opacity:
                      loading ||
                      (mode === 'email' && !isValidEmail) ||
                      (mode === 'login' && !password) ||
                      (mode === 'signup' && (!password || !confirmPassword))
                        ? 0.5
                        : 1,
                  },
                ]}
                onPress={
                  mode === 'email'
                    ? handleNext
                    : mode === 'login'
                      ? handleSignIn
                      : handleSignUp
                }
                disabled={
                  loading ||
                  (mode === 'email' && !isValidEmail) ||
                  (mode === 'login' && !password) ||
                  (mode === 'signup' && (!password || !confirmPassword))
                }
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: isDark ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    {mode === 'email' ? 'Next' : mode === 'login' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </TouchableOpacity>
            </MotiView>

            {/* Mode switch link */}
            {mode !== 'email' && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 300, delay: 200 }}
                style={styles.switchContainer}
              >
                <Text style={[styles.switchText, { color: c.textTertiary }]}>
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <TouchableOpacity
                  onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.switchLink, { color: c.accent }]}>
                    {mode === 'login' ? 'Create one' : 'Sign in'}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            )}
          </View>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  formSection: {
    flex: 1,
  },
  formScrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  formGap: {
    gap: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    paddingBottom: 8,
    gap: 16,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

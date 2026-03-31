import { useState } from 'react';
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
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import AuthInput from '@/components/auth/AuthInput';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendCode = async () => {
    setError('');
    if (!isValidEmail) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) {
        setError(resetError.message);
      } else {
        router.push({ pathname: '/(auth)/reset-password', params: { email } });
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

          {/* Title */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
            style={styles.headerSection}
          >
            <Text style={[styles.title, { color: c.textPrimary }]}>
              Reset your password
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Enter your email and we'll send you a code to reset your password
            </Text>
          </MotiView>

          {/* Form */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 200 }}
            style={styles.formSection}
          >
            <AuthInput
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              placeholder="you@example.com"
              error={error}
              autoFocus={!params.email}
            />
          </MotiView>

          {/* Spacer */}
          <View style={styles.flex} />

          {/* Send button */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, delay: 300 }}
            style={styles.bottomSection}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#000000',
                  opacity: loading || !isValidEmail ? 0.5 : 1,
                },
              ]}
              onPress={handleSendCode}
              disabled={loading || !isValidEmail}
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
                  Send reset code
                </Text>
              )}
            </TouchableOpacity>
          </MotiView>
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
  formSection: {},
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

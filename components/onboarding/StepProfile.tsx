import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import AvatarPicker from './AvatarPicker';
import type { UsernameStatus } from './useUsernameCheck';

interface StepProfileProps {
  username: string;
  onUsernameChange: (text: string) => void;
  usernameStatus: UsernameStatus;
  avatarUri: string | null;
  onAvatarPick: (uri: string) => void;
}

export default function StepProfile({
  username,
  onUsernameChange,
  usernameStatus,
  avatarUri,
  onAvatarPick,
}: StepProfileProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getBorderColor = () => {
    if (usernameStatus === 'taken') return isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    if (usernameStatus === 'available') return c.accent;
    if (usernameStatus === 'invalid') return isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  };

  const getStatusHint = () => {
    if (usernameStatus === 'taken') return 'Username already taken';
    if (usernameStatus === 'invalid' && username.trim().length > 0 && username.trim().length < 3)
      return 'Minimum 3 characters';
    return null;
  };

  const hint = getStatusHint();

  return (
    <View style={styles.container}>
      <View style={styles.avatarSection}>
        <AvatarPicker
          username={username}
          avatarUri={avatarUri}
          onPickImage={onAvatarPick}
          size={100}
        />
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 300 }}
        >
          <Text style={[styles.avatarHint, { color: c.textTertiary }]}>
            Tap to add a photo
          </Text>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300, delay: 200 }}
      >
        <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>Username</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: getBorderColor(),
                color: c.textPrimary,
                paddingRight: 44,
              },
            ]}
            placeholder="Choose a username"
            placeholderTextColor={c.textTertiary}
            value={username}
            onChangeText={onUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />
          <View style={styles.statusIcon}>
            {usernameStatus === 'checking' && (
              <ActivityIndicator size="small" color={c.textTertiary} />
            )}
            {usernameStatus === 'available' && (
              <Ionicons name="checkmark-circle" size={20} color={c.accent} />
            )}
            {usernameStatus === 'taken' && (
              <Ionicons name="close-circle" size={20} color={c.textTertiary} />
            )}
          </View>
        </View>
        {hint && (
          <Text style={[styles.hintText, { color: c.textTertiary }]}>{hint}</Text>
        )}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },
  avatarHint: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  statusIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});

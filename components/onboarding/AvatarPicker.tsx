import { View, Text, Image, TouchableOpacity, Alert, Platform, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

interface AvatarPickerProps {
  username: string;
  avatarUri: string | null;
  onPickImage: (uri: string) => void;
  size?: number;
}

export default function AvatarPicker({
  username,
  avatarUri,
  onPickImage,
  size = 100,
}: AvatarPickerProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const initials = username
    .trim()
    .slice(0, 2)
    .toUpperCase() || '?';

  const handlePress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow camera access to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            onPickImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            onPickImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const badgeSize = size * 0.3;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 14, delay: 100 }}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={{ alignItems: 'center' }}>
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isDark ? '#222222' : '#E0E0E0',
            },
          ]}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
              }}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.initials,
                {
                  fontSize: size * 0.35,
                  color: isDark ? '#FFFFFF' : '#000000',
                },
              ]}
            >
              {initials}
            </Text>
          )}
        </View>

        {/* Camera badge */}
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: c.accent,
              borderColor: c.background,
              bottom: 0,
              right: (size - badgeSize) / 2 - badgeSize / 2 + 4,
            },
          ]}
        >
          <Ionicons
            name="camera"
            size={badgeSize * 0.55}
            color={c.background}
          />
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

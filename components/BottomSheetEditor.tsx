import { ReactNode } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';

interface BottomSheetEditorProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: ReactNode;
}

export default function BottomSheetEditor({
  visible,
  title,
  onClose,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = 'Save',
  children,
}: BottomSheetEditorProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity
          style={{ height: 60 + insets.top }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={{
            flex: 1,
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 0.5,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          >
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary }}>
              {title}
            </Text>
            {onSave ? (
              <TouchableOpacity
                onPress={onSave}
                disabled={saveDisabled || saving}
                activeOpacity={0.7}
                style={{ opacity: saveDisabled || saving ? 0.4 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={c.accent} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.accent }}>
                    {saveLabel}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 32 + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useColors } from '@/hooks/useThemeColors';

export interface PickerItem {
  id: string;
  name: string;
  imageUrl: string;
  group?: string;
}

interface AssetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  title: string;
  items: PickerItem[];
  accentColor: string;
  numColumns?: number;
  /** When true, the last item is rendered centered on its own row (e.g. Radiant) */
  lastItemCentered?: boolean;
  /** When true, the first item is rendered centered on its own row (e.g. Unranked) */
  firstItemCentered?: boolean;
  /** IDs of items that should be grayed out and non-selectable */
  disabledIds?: string[];
}

const { width: SCREEN_W } = Dimensions.get('window');

export default function AssetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  title,
  items,
  accentColor,
  numColumns = 3,
  lastItemCentered = false,
  firstItemCentered = false,
  disabledIds = [],
}: AssetPickerModalProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const GAP = 10;
  const PADDING = 20;
  const cellSize = (SCREEN_W - PADDING * 2 - GAP * (numColumns - 1)) / numColumns;

  // Group items by their group field (if present)
  const hasGroups = items.some((i) => i.group);
  const groups: { label: string; items: PickerItem[] }[] = [];

  if (hasGroups) {
    const groupMap = new Map<string, PickerItem[]>();
    for (const item of items) {
      const key = item.group ?? '';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }
    for (const [label, groupItems] of groupMap) {
      groups.push({ label, items: groupItems });
    }
  } else {
    groups.push({ label: '', items });
  }

  // Separate first/last items if they should be centered
  let mainItems = items;
  let centeredFirstItem: PickerItem | null = null;
  let centeredLastItem: PickerItem | null = null;

  if (!hasGroups && items.length > 0) {
    let start = 0;
    let end = items.length;

    if (firstItemCentered) {
      centeredFirstItem = items[0];
      start = 1;
    }
    if (lastItemCentered) {
      centeredLastItem = items[items.length - 1];
      end = items.length - 1;
    }

    mainItems = items.slice(start, end);
    groups.length = 0;
    groups.push({ label: '', items: mainItems });
  }

  const renderItem = (item: PickerItem) => {
    const isSelected = item.id === selectedId;
    const isDisabled = disabledIds.includes(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => !isDisabled && onSelect(item.id)}
        disabled={isDisabled}
        style={{
          width: cellSize,
          alignItems: 'center',
          marginBottom: 12,
          opacity: isDisabled ? 0.3 : 1,
        }}
      >
        <View
          style={{
            width: cellSize - 8,
            height: cellSize - 8,
            borderRadius: 14,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected
              ? accentColor
              : isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)',
            backgroundColor: isSelected
              ? `${accentColor}15`
              : isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.02)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
          }}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '80%', height: '80%' }}
            resizeMode="contain"
          />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
            color: isSelected ? accentColor : c.textSecondary,
            textAlign: 'center',
          }}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const ROLE_LABELS: Record<string, string> = {
    duelist: 'Duelists',
    initiator: 'Initiators',
    controller: 'Controllers',
    sentinel: 'Sentinels',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        {/* Spacer to push content down */}
        <TouchableOpacity style={{ height: 60 + insets.top }} onPress={onClose} activeOpacity={1} />

        {/* Content */}
        <View
          style={{
            flex: 1,
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: PADDING,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 0.5,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: c.textPrimary,
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingTop: 16,
              paddingBottom: 40 + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Centered first item (e.g. Unranked) */}
            {centeredFirstItem && (
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {renderItem(centeredFirstItem)}
              </View>
            )}

            {groups.map((group) => (
              <View key={group.label}>
                {group.label !== '' && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 3,
                      color: c.textTertiary,
                      marginBottom: 12,
                      marginTop: 8,
                    }}
                  >
                    {ROLE_LABELS[group.label] ?? group.label}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: GAP,
                  }}
                >
                  {group.items.map(renderItem)}
                </View>
              </View>
            ))}

            {/* Centered last item (e.g. Radiant) */}
            {centeredLastItem && (
              <View style={{ alignItems: 'center' }}>
                {renderItem(centeredLastItem)}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

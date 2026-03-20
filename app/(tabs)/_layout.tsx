import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '@/stores/gameStore';
import { GAME_ACCENTS, LIGHT_COLORS, DARK_COLORS } from '@/lib/constants';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconOutline: TabIconName;
}

const TAB_CONFIG: TabConfig[] = [
  { name: 'scrims', title: 'Scrims', icon: 'flash', iconOutline: 'flash-outline' },
  { name: 'team', title: 'Team', icon: 'people', iconOutline: 'people-outline' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'profile', title: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const selectedGame = useGameStore((s) => s.selectedGame);
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === 'dark';
  const base = isDark ? DARK_COLORS : LIGHT_COLORS;
  const game = GAME_ACCENTS[selectedGame];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          elevation: 0,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom || 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: game.accent,
        tabBarInactiveTintColor: isDark ? '#555555' : '#AAAAAA',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View className="items-center">
                {focused && (
                  <View
                    className="absolute -top-1 h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: game.accent }}
                  />
                )}
                <Ionicons
                  name={focused ? tab.icon : tab.iconOutline}
                  size={22}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

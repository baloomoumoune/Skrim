import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/stores/gameStore';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconOutline: TabIconName;
}

const TAB_CONFIG: TabConfig[] = [
  { name: 'feed', title: 'Feed', icon: 'search', iconOutline: 'search-outline' },
  { name: 'my-scrims', title: 'Scrims', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { name: 'team', title: 'Team', icon: 'people', iconOutline: 'people-outline' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'profile', title: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

export default function TabsLayout() {
  const theme = useGameStore((state) => state.getTheme());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.surfaceBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

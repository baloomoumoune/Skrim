import { View } from 'react-native';

// This screen is never visible — LoadingScreen covers it while _layout.tsx
// determines the redirect destination (login, onboarding, or tabs).
export default function Index() {
  return <View className="flex-1 bg-background" />;
}

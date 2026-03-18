import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Profile] Signing out...');
          await signOut();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.text}>Profile</Text>
        {user && (
          <Text style={styles.email}>{user.email ?? user.id}</Text>
        )}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { color: '#ECE8E1', fontSize: 24, fontWeight: 'bold' },
  email: { color: '#768A96', fontSize: 14 },
  signOutButton: {
    marginTop: 24,
    backgroundColor: '#FF4655',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

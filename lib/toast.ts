import { Alert } from 'react-native';

/**
 * Show a user-facing error.
 * Uses Alert for now — can be swapped for a toast library later.
 */
export function showError(title: string, message?: string) {
  Alert.alert(title, message ?? 'Please try again.');
}

import { Alert, Platform } from 'react-native';

/** A simple message box. (Alert.alert does nothing on the web build, so it uses alert there.) */
export function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

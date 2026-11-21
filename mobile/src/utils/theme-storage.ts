import * as SecureStore from 'expo-secure-store';

const KEY = 'meditrack_theme';

export async function loadThemeChoice() {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveThemeChoice(choice: string) {
  try {
    await SecureStore.setItemAsync(KEY, choice);
  } catch {
    // Not saved: the theme still changes for this session.
  }
}

const KEY = 'meditrack_theme';

export async function loadThemeChoice() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveThemeChoice(choice: string) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Not saved: the theme still changes for this session.
  }
}

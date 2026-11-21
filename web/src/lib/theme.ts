export type Theme = 'light' | 'dark';

const KEY = 'meditrack-theme';

// Dark unless the user has chosen light. (index.html applies this before first paint.)
export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the theme still changes for this visit.
  }
}

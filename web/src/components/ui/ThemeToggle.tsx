import { useState } from 'react';
import { getTheme, setTheme, type Theme } from '../../lib/theme';

// One button that flips between light and dark. It names what it will switch TO.
export function ThemeToggle({ className = 'a-btn a-btn-sm' }: { className?: string }) {
  const [theme, setCurrent] = useState<Theme>(getTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  function flip() {
    setTheme(next);
    setCurrent(next);
  }

  return (
    <button type="button" className={className} onClick={flip} aria-label={`Switch to ${next} mode`}>
      {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
    </button>
  );
}

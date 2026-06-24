import { useEffect, type ReactNode } from 'react';
import { applyTheme, useThemeStore } from '../store/themeStore';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return children;
}

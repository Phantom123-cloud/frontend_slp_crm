import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: localStorage.getItem('theme') !== 'light',

  toggle: () => {
    const next = !get().isDark;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    set({ isDark: next });
  },
}));

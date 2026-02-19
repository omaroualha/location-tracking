import { create } from 'zustand';
import { saveState, loadState } from '@features/queue/database';
import type { ThemeMode, ThemeStore } from './types';

const THEME_STORAGE_KEY = 'app_theme_mode';

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'dark',

  toggleTheme: () =>
    set((state) => {
      const newMode: ThemeMode = state.mode === 'dark' ? 'light' : 'dark';
      saveState(THEME_STORAGE_KEY, newMode).catch(console.error);
      return { mode: newMode };
    }),

  setTheme: (mode: ThemeMode) => {
    saveState(THEME_STORAGE_KEY, mode).catch(console.error);
    set({ mode });
  },
}));

export async function restoreThemeState(): Promise<ThemeMode> {
  try {
    const savedMode = await loadState<ThemeMode>(THEME_STORAGE_KEY);
    if (savedMode === 'dark' || savedMode === 'light') {
      useThemeStore.setState({ mode: savedMode });
      return savedMode;
    }
  } catch (error) {
    console.error('[ThemeStore] Failed to restore theme:', error);
  }
  return 'dark';
}
